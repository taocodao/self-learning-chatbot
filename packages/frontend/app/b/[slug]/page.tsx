'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/lib/api-client';
import toast, { Toaster } from 'react-hot-toast';
import { Smartphone, ExternalLink, CheckCircle, MessageCircle } from 'lucide-react';

export default function BusinessQRLandingPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [sessionData, setSessionData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [businessInfo, setBusinessInfo] = useState({
        name: 'Plomería Experta',
        description: 'Servicio profesional 24/7',
    });

    useEffect(() => {
        createSession();
    }, [slug]);

    async function createSession() {
        try {
            setLoading(true);
            const barcodeData = `business:${slug}`;
            const result = await apiClient.createSession(barcodeData, slug);
            setSessionData(result.data);
        } catch (error) {
            toast.error('Error al crear sesión');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const openWhatsApp = () => {
        if (sessionData?.whatsappLink) {
            window.location.href = sessionData.whatsappLink;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Preparando tu sesión...</p>
                </div>
            </div>
        );
    }

    // Detect if mobile
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50">
            <Toaster position="top-center" />

            <div className="container mx-auto px-4 py-8 md:py-16">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-block bg-white rounded-full p-4 shadow-lg mb-4">
                            <MessageCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            {businessInfo.name}
                        </h1>
                        <p className="text-lg text-gray-600">
                            {businessInfo.description}
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* Mobile: Direct Button */}
                        {isMobile ? (
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        ¡Listo para Chatear!
                                    </h2>
                                    <p className="text-gray-600">
                                        Toca el botón para abrir WhatsApp
                                    </p>
                                </div>

                                <button
                                    onClick={openWhatsApp}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-xl flex items-center justify-center gap-3 transition shadow-lg hover:shadow-xl text-lg"
                                >
                                    <Smartphone className="w-6 h-6" />
                                    Abrir WhatsApp
                                </button>

                                <div className="mt-6 space-y-3">
                                    <InfoItem
                                        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                                        text="Respuestas instantáneas"
                                    />
                                    <InfoItem
                                        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                                        text="Envía fotos y videos"
                                    />
                                    <InfoItem
                                        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                                        text="Agenda citas fácilmente"
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Desktop: QR Code */
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        Escanea con tu Teléfono
                                    </h2>
                                    <p className="text-gray-600">
                                        Usa la cámara de tu teléfono o WhatsApp
                                    </p>
                                </div>

                                {/* QR Code */}
                                <div className="flex justify-center mb-6">
                                    <div className="bg-white p-6 rounded-xl border-4 border-green-600 shadow-lg">
                                        {sessionData?.whatsappLink && (
                                            <QRCodeSVG
                                                value={sessionData.whatsappLink}
                                                size={280}
                                                level="H"
                                                includeMargin
                                                fgColor="#16a34a"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="bg-green-50 rounded-lg p-6 mb-6">
                                    <h3 className="font-semibold text-green-900 mb-3 text-center">
                                        Instrucciones:
                                    </h3>
                                    <ol className="space-y-2 text-gray-700">
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold text-green-600">1.</span>
                                            <span>Abre WhatsApp en tu teléfono</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold text-green-600">2.</span>
                                            <span>Escanea este código QR</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold text-green-600">3.</span>
                                            <span>Comienza a chatear</span>
                                        </li>
                                    </ol>
                                </div>

                                {/* Web WhatsApp Button */}
                                <button
                                    onClick={openWhatsApp}
                                    className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                    O Abrir en WhatsApp Web
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <FeatureBox
                            emoji="💬"
                            title="Pregunta lo que Necesites"
                            description="Precios, horarios, disponibilidad"
                        />
                        <FeatureBox
                            emoji="📹"
                            title="Envía Videos"
                            description="Muéstranos el problema para diagnóstico"
                        />
                        <FeatureBox
                            emoji="📅"
                            title="Reserva Citas"
                            description="Agenda directamente desde el chat"
                        />
                    </div>

                    {/* Session Info (for debugging) */}
                    {process.env.NODE_ENV === 'development' && sessionData && (
                        <div className="mt-8 text-center text-xs text-gray-400">
                            Session: {sessionData.sessionId?.slice(0, 8)}...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-3 text-gray-700">
            {icon}
            <span>{text}</span>
        </div>
    );
}

function FeatureBox({ emoji, title, description }: any) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-3xl mb-2">{emoji}</div>
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
            <p className="text-xs text-gray-600">{description}</p>
        </div>
    );
}
