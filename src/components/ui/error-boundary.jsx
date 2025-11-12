import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. 
                {this.props.showError && this.state.error && (
                  <span className="block mt-2 text-sm font-mono text-red-600">
                    {this.state.error.toString()}
                  </span>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorState({ 
  title = "Something went wrong",
  message = "We couldn't complete your request. Please try again.",
  onRetry,
  showHome = true
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{message}</p>
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        {showHome && (
          <Button onClick={() => window.location.href = '/'}>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  );
}