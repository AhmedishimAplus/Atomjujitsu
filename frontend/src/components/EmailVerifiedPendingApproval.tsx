import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import { CheckCircle, Clock } from 'lucide-react';

const EmailVerifiedPendingApproval: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 mb-6">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>

                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Email Verified!</h2>

                    <div className="mb-6">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            <p className="text-lg font-medium text-yellow-600">Awaiting Admin Approval</p>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Your email has been successfully verified. However, before you can access the system, an administrator needs to approve your account.
                        </p>

                        <div className="bg-blue-50 p-4 rounded-md text-left">
                            <h3 className="font-semibold text-blue-700 mb-2">What happens next?</h3>
                            <ul className="list-disc list-inside text-blue-700 space-y-1 text-sm">
                                <li>An administrator will review your registration</li>
                                <li>You'll receive an email notification when your account is approved</li>
                                <li>Once approved, you can log in and access the cashier interface</li>
                            </ul>
                        </div>
                    </div>

                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    >
                        Go to Login Page
                    </Button>

                    <p className="mt-6 text-sm text-gray-500">
                        If you have any questions or need assistance, please contact your system administrator.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmailVerifiedPendingApproval;
