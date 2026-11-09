import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateReferenceNumber } from '@/lib/ref-generator';
import { logActivity } from '@/lib/activity-log';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const dateFilterType = searchParams.get('date_filter') || 'month';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  const now = new Date();
  let dateCondition: any = undefined;

  if (dateFilterType === 'week') {
    const monday = new Date();
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    dateCondition = { gte: monday };
  } else if (dateFilterType === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateCondition = { gte: firstDay };
  } else if (dateFilterType === 'year') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    dateCondition = { gte: firstDay };
  } else if (dateFilterType === 'range' && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateCondition = { gte: start, lte: end };
  }

  const where: any = {};
  if (dateCondition) {
    where.bookingDate = dateCondition;
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { refNumber: { contains: term, mode: 'insensitive' } },
      { customerName: { contains: term, mode: 'insensitive' } },
      { blAwb: { contains: term, mode: 'insensitive' } },
      { invoices: { some: { invoiceNo: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      invoices: {
        orderBy: { lineNo: 'asc' },
      },
      creator: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'VIEW') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { baseFields, customData, invoices } = body;

    // Validate Invoice Nos
    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json({ error: 'At least one invoice line is required.' }, { status: 400 });
    }

    const invNos: string[] = [];
    for (const inv of invoices) {
      const invNo = (inv.invoiceNo || '').trim();
      if (!invNo) {
        return NextResponse.json({ error: 'Invoice Number is mandatory for all invoice lines.' }, { status: 400 });
      }
      invNos.push(invNo);
    }

    // Check duplicate invoice numbers within the form
    const counts = invNos.reduce((acc: Record<string, number>, num) => {
      acc[num] = (acc[num] || 0) + 1;
      return acc;
    }, {});
    const duplicatesInForm = Object.keys(counts).filter((num) => counts[num] > 1);
    if (duplicatesInForm.length > 0) {
      return NextResponse.json(
        { error: `Duplicate Invoice Numbers entered within the same shipment: ${duplicatesInForm.join(', ')}` },
        { status: 400 }
      );
    }

    // Check duplicate invoice numbers in database
    const existingInvoices = await prisma.shipmentInvoice.findMany({
      where: { invoiceNo: { in: invNos } },
      select: { invoiceNo: true },
    });
    if (existingInvoices.length > 0) {
      const dbDups = existingInvoices.map((i) => i.invoiceNo);
      return NextResponse.json(
        { error: `Duplicate Entry Detected: These Invoice Numbers already exist in the database: ${dbDups.join(', ')}` },
        { status: 400 }
      );
    }

    // Check duplicate BL/AWB in database
    const blAwb = (baseFields.blAwb || '').trim();
    if (blAwb) {
      const existingBl = await prisma.shipment.findFirst({
        where: { blAwb: { equals: blAwb, mode: 'insensitive' } },
      });
      if (existingBl) {
        return NextResponse.json(
          { error: 'Duplicate Entry Detected: A shipment with the same BL/AWB already exists.' },
          { status: 400 }
        );
      }
    }

    // Customer match validation for LC / TT
    const paymentType = baseFields.paymentType;
    const payRefNo = (baseFields.payRefNo || '').trim();
    const customerName = (baseFields.customerName || '').trim();

    if (paymentType === 'LC' && payRefNo && customerName) {
      const lc = await prisma.letterOfCredit.findUnique({
        where: { lcNo: payRefNo },
        select: { customerName: true },
      });
      if (lc && lc.customerName && lc.customerName.toLowerCase() !== customerName.toLowerCase()) {
        return NextResponse.json(
          { error: `Customer Name does not match the customer registered for this LC (${lc.customerName}).` },
          { status: 400 }
        );
      }
    } else if (paymentType === 'TT' && payRefNo && customerName) {
      const tt = await prisma.telegraphicTransfer.findUnique({
        where: { ttNo: payRefNo },
        select: { customerName: true },
      });
      if (tt && tt.customerName && tt.customerName.toLowerCase() !== customerName.toLowerCase()) {
        return NextResponse.json(
          { error: `Customer Name does not match the customer registered for this TT (${tt.customerName}).` },
          { status: 400 }
        );
      }
    }

    // Atomic Sequential Number & Reference Number Assignment with concurrency retry
    let result: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await prisma.$transaction(async (tx) => {
          const maxShipment = await tx.shipment.findFirst({
            orderBy: { no: 'desc' },
            select: { no: true },
          });
          const newNo = maxShipment && maxShipment.no ? maxShipment.no + 1 : 1;

          const bookingDate = baseFields.bookingDate ? new Date(baseFields.bookingDate) : new Date();
          const refNumber = generateReferenceNumber(bookingDate, customerName, newNo);

          const shipment = await tx.shipment.create({
            data: {
              no: newNo,
              bookingDate,
              refNumber,
              customerName: baseFields.customerName || null,
              paymentType: baseFields.paymentType || null,
              payRefNo: baseFields.payRefNo || null,
              packageType: baseFields.packageType || null,
              hsCode: baseFields.hsCode || null,
              shipmentMode: baseFields.shipmentMode || null,
              incoterm: baseFields.incoterm || null,
              cbm: baseFields.cbm ? Number(baseFields.cbm) : null,
              delFrom: baseFields.delFrom || null,
              delTo: baseFields.delTo || null,
              blAwb: baseFields.blAwb || null,
              port: baseFields.port || null,
              cha: baseFields.cha || null,
              cusdc: baseFields.cusdc || null,
              cusdcDate: baseFields.cusdcDate ? new Date(baseFields.cusdcDate) : null,
              forwarderType: baseFields.forwarderType || null,
              forwarder: baseFields.forwarder || null,
              quotationValue: baseFields.quotationValue ? Number(baseFields.quotationValue) : null,
              delStatus: baseFields.delStatus || 'Pending',
              paymentStatus: baseFields.paymentStatus || 'Pending',
              statusFlag: 'Active',
              remark: baseFields.remark || null,
              userName: user.name,
              customData: customData || {},
              createdBy: user.id,
            },
          });

          // Insert Invoices
          let lineNo = 1;
          for (const inv of invoices) {
            await tx.shipmentInvoice.create({
              data: {
                shipmentId: shipment.id,
                lineNo: lineNo++,
                invoiceNo: inv.invoiceNo.trim(),
                elementsCount: inv.elementsCount ? Number(inv.elementsCount) : null,
                primaryQtyNw: inv.primaryQtyNw ? Number(inv.primaryQtyNw) : null,
                secondaryQtyGw: inv.secondaryQtyGw ? Number(inv.secondaryQtyGw) : null,
                shipmentValue: inv.shipmentValue ? Number(inv.shipmentValue) : null,
                customData: inv.customData || {},
              },
            });
          }

          return shipment;
        });
        break;
      } catch (err: any) {
        attempts++;
        if (err?.code === 'P2002' && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempts * 50));
          continue;
        }
        throw err;
      }
    }

    await logActivity(user.id, 'Created', result.refNumber);

    return NextResponse.json({ success: true, shipmentId: result.id, refNumber: result.refNumber });
  } catch (error: any) {
    console.error('Shipment creation error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A duplicate record conflict occurred. Please try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An error occurred while saving the shipment. Please try again.' }, { status: 500 });
  }
}
