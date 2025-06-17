export default function ApplicationStatus() {
  const [, params] = useRoute('/application-status/:token');
  const token = params?.token;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Application ID</h1>
          <p className="text-gray-600 mb-6">The application ID provided is not valid.</p>
          <Button onClick={() => window.location.href = '/'}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Status</h1>
          <p className="text-gray-600">Track your merchant application progress</p>
        </div>

        {/* Use the reusable ApplicationStatusWidget */}
        <ApplicationStatusWidget 
          token={token} 
          size="large" 
          showDetails={true} 
          showActions={true}
          className="w-full"
        />
      </div>
    </div>
  );
}