import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorStack: string;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorStack: '',
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error, errorStack: error.stack || '' };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-lg">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-800 mb-2">Erro na Renderização</h2>
                        <p className="text-sm text-red-600 mb-4">
                            Ocorreu um erro ao renderizar este componente.
                        </p>
                        <div className="bg-red-100 rounded-lg p-4 text-left mb-4 overflow-auto max-h-[200px]">
                            <p className="text-xs font-mono text-red-700 break-all">
                                {this.state.error?.message || 'Erro desconhecido'}
                            </p>
                            {this.state.errorStack && (
                                <pre className="text-[10px] font-mono text-red-500 mt-2 whitespace-pre-wrap">
                                    {this.state.errorStack.split('\n').slice(0, 5).join('\n')}
                                </pre>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null, errorStack: '' });
                            }}
                            className="flex items-center gap-2 mx-auto bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Tentar Novamente
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
