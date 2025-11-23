'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
    const [sessionId, setSessionId] = useState<string>('');
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        async function init() {
            const result: any = await apiClient.createSession('demo-session', 'demo');
            setSessionId(result.data.sessionId);
        }
        init();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-green-600 text-white p-4">
                <div className="container mx-auto flex items-center gap-4">
                    <Link href="/" className="hover:bg-green-700 p-2 rounded">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <MessageSquare className="w-6 h-6" />
                    <div>
                        <h1 className="font-bold">Demo del Chatbot</h1>
                        <p className="text-xs text-green-100">En producción, esto sería WhatsApp</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4 max-w-2xl">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                        <strong>Nota:</strong> En el sistema real, los usuarios chatean directamente en
                        <strong> WhatsApp</strong>. Esta es solo una demo web para probar la funcionalidad.
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <p className="text-gray-600 text-center">
                        Para experiencia completa, escanea el QR y chatea en WhatsApp
                    </p>
                    <div className="mt-6 text-center">
                        <Link
                            href="/b/demo"
                            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                        >
                            Ver Página de QR
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
