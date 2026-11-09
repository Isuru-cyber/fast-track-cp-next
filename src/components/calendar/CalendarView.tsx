'use client';

import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { useToast } from '@/context/ToastContext';

export default function CalendarView() {
  const { showToast } = useToast();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const currYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currYear - 3; y <= currYear + 3; y++) {
    yearOptions.push(y);
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10);
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      const currentDate = api.getDate();
      const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
      api.gotoDate(newDate);
    }
  };

  const openModal = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setModalOpen(true);
    setModalLoading(true);

    try {
      const res = await fetch(`/api/calendar/day-summary?date=${dateStr}`);
      const data = await res.json();
      setModalData(data);
    } catch {
      showToast('Failed to load day summary.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Shipment Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">View actual shipments and upcoming plans</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div> Actual
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div> Planned
          </div>
          <div className="ml-4">
            <select
              onChange={handleYearChange}
              defaultValue={currYear}
              className="py-1 px-2 border border-gray-300 rounded text-sm bg-gray-50 text-gray-700 focus:ring-indigo-500"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 min-h-0 overflow-hidden flex flex-col">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,listWeek',
          }}
          events="/api/calendar/events"
          height="100%"
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            const dateStr = info.event.start?.toISOString().split('T')[0] || '';
            openModal(dateStr);
          }}
          dateClick={(info) => {
            openModal(info.dateStr);
          }}
        />
      </div>

      {/* Day Summary Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">Shipments for {selectedDate}</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {modalLoading ? (
                <div className="flex justify-center py-8">
                  <i className="fas fa-circle-notch fa-spin text-indigo-600 text-3xl"></i>
                </div>
              ) : modalData ? (
                <div className="space-y-6">
                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Actual Shipments</p>
                      <p className="font-bold text-blue-900">{modalData.actual.count} Records</p>
                      <p className="text-sm text-blue-800 mt-1">
                        Qty: {Number(modalData.actual.qty).toFixed(2)} | CBM: {Number(modalData.actual.cbm).toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <p className="text-xs font-semibold text-orange-600 uppercase mb-1">Upcoming/Planned</p>
                      <p className="font-bold text-orange-900">{modalData.planned.count} Records</p>
                      <p className="text-sm text-orange-800 mt-1">
                        Qty: {Number(modalData.planned.qty).toFixed(2)} | CBM:{' '}
                        {Number(modalData.planned.cbm).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Actual Shipments List */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">Actual Shipments</h4>
                    {modalData.actual.items.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No actual shipments on this day.</p>
                    ) : (
                      <div className="space-y-2">
                        {modalData.actual.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-sm"
                          >
                            <div>
                              <p className="font-semibold text-blue-600">{item.refNumber}</p>
                              <p className="text-gray-600">{item.customerName || 'Unknown'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                Qty: {item.qty.toFixed(2)} | CBM: {item.cbm.toFixed(2)}
                              </p>
                              <span className="text-xs text-gray-500">{item.delStatus}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Upcoming Shipments List */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">Upcoming/Planned</h4>
                    {modalData.planned.items.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No planned shipments on this day.</p>
                    ) : (
                      <div className="space-y-2">
                        {modalData.planned.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-sm"
                          >
                            <div>
                              <p className="font-semibold text-orange-600">{item.customerName || 'Unknown'}</p>
                              <p className="text-gray-600">
                                {item.shipmentMode || '-'} / {item.containerType || '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                Approx Qty: {item.qty.toFixed(2)} | CBM: {item.cbm.toFixed(2)}
                              </p>
                              <span className="text-xs text-gray-500">{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
