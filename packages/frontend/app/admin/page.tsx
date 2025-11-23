'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { BarChart3, MessageSquare, Database } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalExamples: 0,
        totalConversations: 0,
        avgConfidence: 0,
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        icon={<Database className="w-8 h-8 text-blue-600" />}
                        title="Ejemplos en la Base"
                        value={stats.totalExamples}
                    />
                    <StatCard
                        icon={<MessageSquare className="w-8 h-8 text-green-600" />}
                        title="Conversaciones"
                        value={stats.totalConversations}
                    />
                    <StatCard
                        icon={<BarChart3 className="w-8 h-8 text-purple-600" />}
                        title="Confianza Promedio"
                        value={`${(stats.avgConfidence * 100).toFixed(0)}%`}
                    />
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Ejemplos Más Usados</h2>
                    <p className="text-gray-600">Lista de ejemplos populares...</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, title, value }: any) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
            </div>
        </div>
    );
}
