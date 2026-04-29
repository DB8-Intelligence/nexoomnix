'use client'

// Error boundary global da área logada. Captura erros renderizados
// em Server Components / Client Components e mostra um fallback
// decente. Quando o BugCatcher está disponível (staff DB8), abre
// automaticamente o modal pré-preenchido com o erro capturado.

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertOctagon, RefreshCcw, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info })
    if (typeof window !== 'undefined' && typeof window.__openBugCatcher === 'function') {
      // Delay pra state estabilizar antes de abrir o modal.
      setTimeout(() => {
        window.__openBugCatcher?.({
          description: `[crash React]\n${error.message}\n\n${info.componentStack ?? ''}`.slice(0, 3000),
          severity: 'high',
        })
      }, 200)
    }
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-lg p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <AlertOctagon className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-lg mb-1">Algo deu errado nessa tela</h2>
          <p className="text-sm text-gray-500 mb-4">
            {this.state.error.message.slice(0, 200)}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
            >
              <RefreshCcw className="w-4 h-4" /> Tentar de novo
            </button>
            {typeof window !== 'undefined' && typeof window.__openBugCatcher === 'function' && (
              <button
                type="button"
                onClick={() => window.__openBugCatcher?.({ severity: 'high' })}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium"
              >
                <Bug className="w-4 h-4" /> Reportar bug
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
