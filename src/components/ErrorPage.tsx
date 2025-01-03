interface ErrorPageProps {
    title?: string;
    message: string;
  }
  
  export default function ErrorPage({ title = 'Error', message }: ErrorPageProps) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-600 text-xl font-semibold mb-4">{title}</div>
          <p className="text-gray-600">{message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }