import { useState, useEffect } from 'react';
import { Home, Settings, BarChart3, FileText, Upload, File, CheckCircle, Leaf, Zap, Factory, TreePine, AlertCircle, Search, Sun, Moon, LogOut, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { BorderTrail } from '../components/ui/border-trail.jsx';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
    const [activeScreen, setActiveScreen] = useState('dashboard');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // Get current user on app load
    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                // If user is logged in, load their files
                if (user) {
                    await loadUserFiles(user.id);
                }
            } catch (error) {
                console.error('Error getting user:', error);
            } finally {
                setLoading(false);
            }
        };

        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                await loadUserFiles(session.user.id);
            } else {
                setUploadedFiles([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load user's uploaded files
    const loadUserFiles = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_files')
                .select('*')
                .eq('user_id', userId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;

            setUploadedFiles(data || []);
        } catch (error) {
            console.error('Error loading user files:', error);
        }
    };

    // Handle document processing
    const handleProcessDocuments = async (documentIds) => {
        if (!user || documentIds.length === 0) {
            setUploadError('Please select documents to process');
            return;
        }

        try {
            setProcessing(true);
            setUploadError(null);

            // Call Supabase Edge Function
            const { data, error } = await supabase.functions.invoke('process-documents', {
                body: {
                    documentIds: documentIds,
                    userId: user.id
                }
            });

            if (error) throw error;

            console.log(`Processing started for ${data.processedCount} documents`);

            // Clear selection and refresh files
            setSelectedDocumentIds([]);
            setSelectAll(false);
            await loadUserFiles(user.id);

        } catch (error) {
            console.error('Processing failed:', error);
            setUploadError(`Processing failed: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    // Toggle document selection
    const toggleDocumentSelection = (docId) => {
        setSelectedDocumentIds(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    // Handle select all
    const handleSelectAll = () => {
        const filteredFiles = uploadedFiles.filter(file =>
            file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (selectAll) {
            setSelectedDocumentIds([]);
        } else {
            setSelectedDocumentIds(filteredFiles.map(file => file.id));
        }
        setSelectAll(!selectAll);
    };

    // Toggle dark mode
    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Define your navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // Handle navigation clicks
    const handleNavClick = (screenId) => {
        setActiveScreen(screenId);
    };

    // Upload file to Supabase Storage with user ID organization
    const handleFileUpload = async (event) => {
        if (!user) {
            setUploadError('Please log in to upload files');
            return;
        }

        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const uploadPromises = files.map(async (file) => {
                // Validate file type
                const validTypes = [
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'image/jpg',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ];

                if (!validTypes.includes(file.type)) {
                    throw new Error(`${file.name} is not a supported file type. Please upload PDF, image, or document files.`);
                }

                // Update progress for this file
                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: 0
                }));

                // Simulate progress updates
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: Math.min((prev[file.name] || 0) + 15, 90)
                    }));
                }, 200);

                try {
                    // Create unique filename with timestamp
                    const timestamp = new Date().toISOString();
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${timestamp}-${file.name}`;

                    // Upload to user-specific folder: userId/filename
                    const filePath = `${user.id}/${fileName}`;

                    // Upload to Supabase Storage
                    const { data, error } = await supabase.storage
                        .from('user-files') // Make sure this bucket exists
                        .upload(filePath, file);

                    if (error) throw error;

                    // Store file metadata in database
                    const { data: dbData, error: dbError } = await supabase
                        .from('user_files')
                        .insert({
                            user_id: user.id,
                            file_name: file.name,
                            file_path: filePath,
                            file_size: file.size,
                            file_type: file.type,
                            uploaded_at: new Date().toISOString(),
                            processed: false,
                            processing_status: 'pending'
                        })
                        .select()
                        .single();

                    if (dbError) throw dbError;

                    // Complete progress
                    clearInterval(progressInterval);
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: 100
                    }));

                    return dbData;

                } catch (error) {
                    clearInterval(progressInterval);
                    throw error;
                }
            });

            // Wait for all uploads to complete
            const results = await Promise.all(uploadPromises);

            // Add files to uploaded files list
            setUploadedFiles(prev => [...results, ...prev]);

            // Clear progress after a delay
            setTimeout(() => {
                setUploadProgress({});
            }, 2000);

        } catch (error) {
            setUploadError(error.message);
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            // Clear the input
            event.target.value = '';
        }
    };

    // Delete file from Supabase
    const deleteFile = async (file) => {
        try {
            // Remove from storage
            const { error: storageError } = await supabase.storage
                .from('user-files')
                .remove([file.file_path]);

            if (storageError) throw storageError;

            // Remove from database
            const { error: dbError } = await supabase
                .from('user_files')
                .delete()
                .eq('id', file.id);

            if (dbError) throw dbError;

            // Update local state
            setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
            setSelectedDocumentIds(prev => prev.filter(id => id !== file.id));

        } catch (error) {
            console.error('Error removing file:', error);
            setUploadError(`Failed to delete ${file.file_name}: ${error.message}`);
        }
    };

    // Get file public URL
    const getFileUrl = (filePath) => {
        const { data } = supabase.storage
            .from('user-files')
            .getPublicUrl(filePath);
        return data.publicUrl;
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Logout function
    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Show loading screen while checking auth
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-white">Loading...</p>
                </div>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center p-8 bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700/20">
                    <div className="inline-flex p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mb-6">
                        <Leaf size={48} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">Welcome to OliveZero</h1>
                    <p className="text-gray-400 mb-6">Please log in to access your carbon tracking dashboard</p>
                    <button
                        onClick={handleLogin}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300"
                    >
                        Log In with Google
                    </button>
                </div>
            </div>
        );
    }
    // Render content based on active screen
    const renderContent = () => {
        switch (activeScreen) {
            case 'dashboard':
                return (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                                <Leaf className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-900'} bg-clip-text text-transparent`}>
                                    Dashboard
                                </h2>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Track and manage your carbon footprint</p>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-gradient-to-br from-red-400 to-red-600 rounded-xl">
                                        <Factory className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Total Emissions</h3>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>2,847 tCO₂e</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full w-3/4"></div>
                                    </div>
                                    <span className="text-sm text-red-600 font-medium">+12%</span>
                                </div>
                            </div>

                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl">
                                        <TreePine className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Carbon Offset</h3>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>1,203 tCO₂e</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-emerald-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full w-2/3"></div>
                                    </div>
                                    <span className="text-sm text-emerald-600 font-medium">+8%</span>
                                </div>
                            </div>

                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl">
                                        <Zap className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Energy Usage</h3>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>45,231 kWh</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-600 rounded-full w-4/5 transition-all duration-1000"></div>
                                    </div>
                                    <span className="text-sm text-amber-600 font-medium">-3%</span>
                                </div>
                            </div>

                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                                        <BarChart3 className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Net Carbon</h3>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>1,644 tCO₂e</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full w-3/5 transition-all duration-1000"></div>
                                    </div>
                                    <span className="text-sm text-blue-600 font-medium">+5%</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-6`}>
                                <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setActiveScreen('documents')}
                                        className={`w-full flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gradient-to-r from-emerald-900/50 to-green-900/50 hover:from-emerald-800/60 hover:to-green-800/60' : 'bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100'} rounded-xl transition-all duration-300 hover:scale-105`}
                                    >
                                        <Upload size={20} className="text-emerald-600" />
                                        <span className="font-medium text-emerald-700">Upload New Invoices</span>
                                    </button>
                                    <button className={`w-full flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gradient-to-r from-blue-900/50 to-indigo-900/50 hover:from-blue-800/60 hover:to-indigo-800/60' : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100'} rounded-xl transition-all duration-300 hover:scale-105`}>
                                        <BarChart3 size={20} className="text-blue-600" />
                                        <span className="font-medium text-blue-700">Generate Report</span>
                                    </button>
                                    <button className={`w-full flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-800/60 hover:to-pink-800/60' : 'bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100'} rounded-xl transition-all duration-300 hover:scale-105`}>
                                        <TreePine size={20} className="text-purple-600" />
                                        <span className="font-medium text-purple-700">Calculate Offsets</span>
                                    </button>
                                </div>
                            </div>

                            <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-6`}>
                                <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-3 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl`}>
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Invoice processed: Energy bill Q3</p>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>2 minutes ago</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl`}>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carbon report generated</p>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>1 hour ago</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl`}>
                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>New emission factor updated</p>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>3 hours ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                <BarChart3 className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                                    Analytics
                                </h2>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Detailed emissions analysis and trends</p>
                            </div>
                        </div>

                        {/* Emissions Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className={`lg:col-span-2 ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-8`}>
                                <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Emissions by Category</h3>
                                <div className={`h-64 ${isDarkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'} rounded-xl flex items-center justify-center border mb-6`}>
                                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-400'} font-medium`}>Interactive Emissions Chart</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className={`text-center p-4 ${isDarkMode ? 'bg-gradient-to-br from-red-900/50 to-orange-900/50' : 'bg-gradient-to-br from-red-50 to-orange-50'} rounded-xl`}>
                                        <div className="text-xl font-bold text-red-600">Scope 1</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Direct Emissions</div>
                                        <div className="text-lg font-semibold text-red-700 mt-1">892 tCO₂e</div>
                                    </div>
                                    <div className={`text-center p-4 ${isDarkMode ? 'bg-gradient-to-br from-amber-900/50 to-yellow-900/50' : 'bg-gradient-to-br from-amber-50 to-yellow-50'} rounded-xl`}>
                                        <div className="text-xl font-bold text-amber-600">Scope 2</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Energy Indirect</div>
                                        <div className="text-lg font-semibold text-amber-700 mt-1">1,245 tCO₂e</div>
                                    </div>
                                    <div className={`text-center p-4 ${isDarkMode ? 'bg-gradient-to-br from-blue-900/50 to-indigo-900/50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} rounded-xl`}>
                                        <div className="text-xl font-bold text-blue-600">Scope 3</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Other Indirect</div>
                                        <div className="text-lg font-semibold text-blue-700 mt-1">710 tCO₂e</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-6`}>
                                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Carbon Intensity</h4>
                                    <div className="text-center">
                                        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>0.34</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>tCO₂e per $1000 revenue</div>
                                        <div className="mt-4 flex items-center justify-center gap-2">
                                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-sm text-emerald-600 font-medium">Improving</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-6`}>
                                    <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Target Progress</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>2030 Target</span>
                                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>68%</span>
                                            </div>
                                            <div className={`h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                                                <div className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full w-2/3 transition-all duration-1000"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Net Zero Goal</span>
                                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>42%</span>
                                            </div>
                                            <div className={`h-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                                                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full w-2/5 transition-all duration-1000"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Trend */}
                        <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-8`}>
                            <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Emissions Trend</h3>
                            <div className={`h-80 ${isDarkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'} rounded-xl flex items-center justify-center border`}>
                                <div className="text-center">
                                    <BarChart3 size={48} className={`${isDarkMode ? 'text-gray-500' : 'text-gray-300'} mx-auto mb-4`} />
                                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-400'} font-medium`}>Time Series Analytics Chart</span>
                                    <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-sm mt-2`}>Visualize emissions trends over time</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'documents':
                const filteredFiles = uploadedFiles.filter(file =>
                    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
                );

                return (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                                <FileText className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                                    Documents
                                </h2>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Upload invoices for automated carbon calculations</p>
                            </div>
                        </div>

                        {/* Upload Section */}
                        <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-8`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                    <Upload className="text-white" size={20} />
                                </div>
                                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upload Invoices</h3>
                            </div>

                            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>Upload energy bills, fuel receipts, and other invoices for automated carbon emission calculations</p>

                            {/* Error Display */}
                            {uploadError && (
                                <div className={`mb-6 p-4 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-xl flex items-center gap-3`}>
                                    <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                                    <p className={`${isDarkMode ? 'text-red-400' : 'text-red-700'} text-sm`}>{uploadError}</p>
                                    <button
                                        onClick={() => setUploadError(null)}
                                        className={`ml-auto ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Upload Progress */}
                            {Object.keys(uploadProgress).length > 0 && (
                                <div className="mb-6 space-y-3">
                                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                        <div key={fileName} className={`p-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-xl`}>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className={`${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{fileName}</span>
                                                <span className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{progress}%</span>
                                            </div>
                                            <div className={`w-full ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-200'} rounded-full h-2 overflow-hidden`}>
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                                    style={{width: `${progress}%`}}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-6">
                                <label className="relative group">
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={isUploading}
                                    />
                                    <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 border-dashed transition-all duration-300 ${
                                        isUploading
                                            ? `${isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'} cursor-not-allowed`
                                            : `${isDarkMode ? 'border-blue-600 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 hover:from-blue-800/30 hover:to-indigo-800/30 hover:border-blue-500' : 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-400'} hover:scale-105 cursor-pointer group-hover:shadow-lg`
                                    }`}>
                                        <Upload size={24} className={`${isUploading ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : 'text-blue-600 group-hover:text-blue-700'} transition-colors`} />
                                        <div>
                                            <span className={`font-semibold text-lg ${isUploading ? (isDarkMode ? 'text-gray-500' : 'text-gray-400') : 'text-blue-600 group-hover:text-blue-700'} transition-colors`}>
                                                {isUploading ? 'Uploading...' : 'Choose Files'}
                                            </span>
                                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>PDF, images, or documents • Max 10MB per file</p>
                                        </div>
                                    </div>
                                </label>

                                {isUploading && (
                                    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white shadow-lg">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                        <span className="font-medium">Uploading to Supabase...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* NEW: Processing Controls */}
                        {uploadedFiles.length > 0 && (
                            <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-6`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                            <Zap className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Process Documents</h3>
                                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {selectedDocumentIds.length} documents selected for processing
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleProcessDocuments(selectedDocumentIds)}
                                        disabled={processing || selectedDocumentIds.length === 0}
                                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                            processing || selectedDocumentIds.length === 0
                                                ? `${isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
                                                : `bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:scale-105 shadow-lg hover:shadow-xl`
                                        }`}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                                <BorderTrail
                                                    className='bg-linear-to-l from-blue-200 via-blue-500 to-blue-200 dark:from-blue-400 dark:via-blue-500 dark:to-blue-700'
                                                    size={120}
                                                />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={20} />
                                                Process {selectedDocumentIds.length} Documents
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Uploaded Files List */}
                        {uploadedFiles.length > 0 && (
                            <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border overflow-hidden`}>
                                <div className={`p-6 ${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'} border-b`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                                <CheckCircle className="text-white" size={20} />
                                            </div>
                                            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                Uploaded Invoices ({filteredFiles.length})
                                            </h3>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search invoices..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={`pl-10 pr-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700/50 text-white border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-300'} border transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                            />
                                            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className={`${isDarkMode ? 'bg-gray-700/20' : 'bg-gray-50'}`}>
                                        <tr>
                                            <th scope="col" className={`py-3.5 pl-6 pr-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll && filteredFiles.length > 0}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                            </th>
                                            <th scope="col" className={`py-3.5 pl-3 pr-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>File Name</th>
                                            <th scope="col" className={`px-3 py-3.5 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Size</th>
                                            <th scope="col" className={`px-3 py-3.5 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Date Uploaded</th>
                                            <th scope="col" className={`px-3 py-3.5 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Status</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-6"><span className="sr-only">Actions</span></th>
                                        </tr>
                                        </thead>
                                        <tbody className={`${isDarkMode ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200'}`}>
                                        {filteredFiles.map((file) => {
                                            const publicUrl = getFileUrl(file.file_path);
                                            const status = file.processed ? 'processed' : file.processing_status;
                                            const isSelected = selectedDocumentIds.includes(file.id);

                                            return (
                                                <tr key={file.id} className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'} transition-colors ${isSelected ? (isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50') : ''}`}>
                                                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleDocumentSelection(file.id)}
                                                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                    </td>
                                                    <td className="whitespace-nowrap py-4 pl-3 pr-3 text-sm">
                                                        <div className="flex items-center">
                                                            <div className={`p-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg mr-4`}>
                                                                <File size={20} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                                            </div>
                                                            <div>
                                                                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{file.file_name}</div>
                                                                <div className={`text-xs capitalize ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{file.file_type.split('/')[1]}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`whitespace-nowrap px-3 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatFileSize(file.file_size)}</td>
                                                    <td className={`whitespace-nowrap px-3 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(file.uploaded_at)}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                                status === 'processed' ? (isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-800') :
                                                                    status === 'processing' ? (isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-800') :
                                                                        status === 'pending' ? (isDarkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-800') :
                                                                            (isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-800')
                                                            }`}>
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </span>
                                                    </td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-4">
                                                            <button onClick={() => window.open(publicUrl, '_blank')} className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}>View</button>
                                                            <button onClick={() => deleteFile(file)} className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'} transition-colors`}>Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {uploadedFiles.length === 0 && !isUploading && !loading && (
                            <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-16 text-center`}>
                                <div className="inline-flex p-4 bg-gradient-to-br from-emerald-100 to-green-200 rounded-2xl mb-6">
                                    <Leaf size={48} className="text-emerald-600" />
                                </div>
                                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>No invoices processed yet</h3>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>Upload your first invoice to start calculating carbon emissions</p>
                            </div>
                        )}
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl">
                                <Settings className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                                    Settings
                                </h2>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Configure your preferences</p>
                            </div>
                        </div>

                        <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border p-8`}>
                            <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Application Settings</h3>
                            <div className="space-y-6">
                                <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl`}>
                                    <div>
                                        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Dark Mode</h4>
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Toggle dark theme</p>
                                    </div>
                                    <button
                                        onClick={toggleDarkMode}
                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                                            isDarkMode ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                                            isDarkMode ? 'right-0.5' : 'left-0.5'
                                        }`}></div>
                                    </button>
                                </div>
                                <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl`}>
                                    <div>
                                        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h4>
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enable push notifications</p>
                                    </div>
                                    <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform shadow-sm"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div>Screen not found</div>;
        }
    };

    return (
        <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-indigo-100'} transition-colors duration-300} transition-colors duration-300 `}>
            {/* Top Navigation Bar */}
            <header className={`${isDarkMode ? 'bg-gray-900 border-b border-gray-700' : 'bg-white border-b border-gray-200'} backdrop-blur-xl shadow-lg sticky top-0 z-20`}>
                <div className="container mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="inline-flex p-2 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-lg">
                            <Leaf className="text-white" size={24} />
                        </div>
                        <h2 className={`text-xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-800 to-gray-900'} bg-clip-text text-transparent`}>
                            OliveZero
                        </h2>
                    </div>

                    {/* Navigation */}
                    <nav>
                        <ul className="flex items-center gap-2">
                            {navItems.map((item) => {
                                const IconComponent = item.icon;
                                const isActive = activeScreen === item.id;
                                return (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => handleNavClick(item.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`
                                            }`}
                                        >
                                            <IconComponent size={18} />
                                            <span>{item.label}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Right side controls */}
                    <div className="flex items-center gap-4">
                        
                        <div className="flex items-center gap-3">
                            <span className={`text-sm hidden sm:inline ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{user.email}</span>
                            <button
                                onClick={handleLogout}
                                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                                aria-label="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col overflow-y-auto ${
                isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
                <main className="flex-1 p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}