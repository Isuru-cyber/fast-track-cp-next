import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Shell from '@/components/layout/Shell';

export default async function DevInfoPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Shell user={user} currentPage="/dev-info">
      <div className="w-full h-full flex flex-col justify-center py-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full flex-shrink-0">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-2">About the Developer</h2>
            <p className="text-indigo-100">Fast-Track System Architecture &amp; Development</p>
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Developer Image */}
              <div className="w-40 h-40 flex-shrink-0 relative rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-indigo-50 flex items-center justify-center">
                <img
                  src="https://ui-avatars.com/api/?name=Isuru+Ranasinghe&background=4f46e5&color=fff&size=200"
                  alt="Isuru Ranasinghe"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Isuru Ranasinghe</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Hello! I developed the Fast-Track System. If you need any modifications, custom
                  features, or technical support for this application, please feel free to contact me
                  using the details below.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-center md:justify-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition hover:bg-gray-100">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-envelope"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Email Address</p>
                      <a
                        href="mailto:isururanasi@gmail.com"
                        className="text-gray-800 font-semibold hover:text-indigo-600 transition"
                      >
                        isururanasi@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:justify-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition hover:bg-gray-100">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <i className="fab fa-telegram-plane"></i>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Telegram ID</p>
                      <a
                        href="https://t.me/IsuruMR"
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-800 font-semibold hover:text-indigo-600 transition"
                      >
                        @IsuruMR
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
              <p>&copy; {new Date().getFullYear()} Fast-Track System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
