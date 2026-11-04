import { Component } from 'react';

/** Evita la pantalla en blanco si una página lanza un error al renderizar. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error en la interfaz:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    // Tras un despliegue, los chunks antiguos dejan de existir: basta con recargar
    const isChunkError = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
      this.state.error?.message || ''
    );

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-(--card-bg) border border-(--border) rounded-3xl p-8 text-center shadow-(--shadow)">
          <p className="!text-center text-4xl mb-3">{isChunkError ? '🔄' : '😵'}</p>
          <h1 className="!text-center text-xl font-black text-(--text-h)">
            {isChunkError ? 'Hay una versión nueva' : 'Algo ha fallado'}
          </h1>
          <p className="!text-center text-sm text-(--text) mt-2">
            {isChunkError ? 'Recarga para usar la última versión de la app.' : 'Recarga la página. Si sigue pasando, vuelve al inicio.'}
          </p>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={() => window.location.reload()} className="flex-1 bg-(--accent) text-white font-bold py-2.5 rounded-xl text-sm">
              Recargar
            </button>
            {!isChunkError && (
              <button type="button" onClick={() => window.location.assign('/')} className="flex-1 border border-(--border) text-(--text-h) font-bold py-2.5 rounded-xl text-sm">
                Inicio
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
