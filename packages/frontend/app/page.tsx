import Link from 'next/link';
import { MessageSquare, Scan, Zap, CheckCircle } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50">
            {/* Hero Section */}
            <nav className="bg-white shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-8 h-8 text-green-600" />
                        <span className="text-xl font-bold">HomeService Bot</span>
                    </div>
                    <Link
                        href="/demo"
                        className="text-green-600 hover:text-green-700 font-medium"
                    >
                        Ver Demo
                    </Link>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-16">
                {/* Hero */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                        Tu Asistente Virtual en{' '}
                        <span className="text-green-600">WhatsApp</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Respuestas instantáneas, análisis de videos y reservas automáticas.
                        Todo desde WhatsApp.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/demo"
                            className="bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition shadow-lg hover:shadow-xl"
                        >
                            Probar Ahora
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-green-600 hover:bg-green-50 transition"
                        >
                            Cómo Funciona
                        </Link>
                    </div>
                </div>

                {/* How It Works */}
                <div id="how-it-works" className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        3 Pasos Simples
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <StepCard
                            number="1"
                            icon={<Scan className="w-12 h-12 text-green-600" />}
                            title="Escanea el QR"
                            description="Encuentra nuestro código QR en el local o sitio web"
                        />
                        <StepCard
                            number="2"
                            icon={<MessageSquare className="w-12 h-12 text-green-600" />}
                            title="Abre WhatsApp"
                            description="El chat se abre automáticamente en tu WhatsApp"
                        />
                        <StepCard
                            number="3"
                            icon={<Zap className="w-12 h-12 text-green-600" />}
                            title="Chatea Libremente"
                            description="Pregunta, envía videos, agenda citas - todo en WhatsApp"
                        />
                    </div>
                </div>

                {/* Features */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        ¿Qué Puedes Hacer?
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        <FeatureCard
                            emoji="💬"
                            title="Preguntas Instantáneas"
                            description="Obtén respuestas inmediatas sobre servicios y precios"
                        />
                        <FeatureCard
                            emoji="📹"
                            title="Análisis de Video"
                            description="Envía un video del problema y recibe diagnóstico automático"
                        />
                        <FeatureCard
                            emoji="📅"
                            title="Reservas Automáticas"
                            description="Agenda citas directamente desde el chat"
                        />
                        <FeatureCard
                            emoji="🤖"
                            title="Auto-Aprendizaje"
                            description="El bot mejora con cada conversación"
                        />
                    </div>
                </div>

                {/* Social Proof */}
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-green-600 mb-2">24/7</div>
                            <div className="text-gray-600">Disponibilidad</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-green-600 mb-2">&lt;2min</div>
                            <div className="text-gray-600">Tiempo de Respuesta</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-green-600 mb-2">95%</div>
                            <div className="text-gray-600">Satisfacción</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepCard({ number, icon, title, description }: any) {
    return (
        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl font-bold text-green-600 mx-auto mb-4">
                {number}
            </div>
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </div>
    );
}

function FeatureCard({ emoji, title, description }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition text-center">
            <div className="text-5xl mb-4">{emoji}</div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </div>
    );
}
