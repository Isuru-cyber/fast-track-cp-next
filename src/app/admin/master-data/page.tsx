import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Shell from '@/components/layout/Shell';
import AdminTabs from '@/components/admin/AdminTabs';
import MasterDataManager from '@/components/admin/MasterDataManager';

interface Props {
  searchParams: Promise<{
    module?: string;
    cat?: string;
  }>;
}

export default async function MasterDataPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'VIEW') redirect('/dashboard');

  const resolved = await searchParams;
  const initialModule = resolved.module || 'SHIPMENT';
  const initialCategory = resolved.cat;

  // Retrieve dynamic categories from field_configs for each module
  const configs = await prisma.fieldConfig.findMany({
    where: {
      optionsCategory: { not: null },
    },
    select: {
      module: true,
      optionsCategory: true,
    },
  });

  const dynamicCategories: Record<string, string[]> = {
    SHIPMENT: [],
    LC: [],
    UPCOMING: [],
  };

  configs.forEach((c) => {
    if (c.optionsCategory && dynamicCategories[c.module]) {
      if (!dynamicCategories[c.module].includes(c.optionsCategory)) {
        dynamicCategories[c.module].push(c.optionsCategory);
      }
    }
  });

  return (
    <Shell user={user} currentPage="/admin/master-data">
      <div className="w-full h-full flex flex-col gap-3 overflow-hidden">
        <AdminTabs userRole={user.role} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <MasterDataManager
            initialModule={initialModule}
            initialCategory={initialCategory}
            userRole={user.role}
            dynamicCategories={dynamicCategories}
          />
        </div>
      </div>
    </Shell>
  );
}
