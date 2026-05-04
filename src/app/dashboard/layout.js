"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Navbar />
        <main className="ml-64 pt-16 p-6">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}