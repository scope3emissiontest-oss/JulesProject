import { useState } from 'react';
import { Home, Settings, BarChart3, FileText, Menu, X, Upload, File, CheckCircle, Leaf, Zap, Factory, TreePine, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
    const [activeScreen, setActiveScreen] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isDarkMode, setIsDarkMode] = useState(true);

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

    // Toggle sidebar on mobile
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Upload file to Supabase Storage
    const uploadFileToSupabase = async (file) => {
        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `invoices/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('uploads') // Make sure this bucket exists in your Supabase project
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath);

            return {
                path: data.path,
                publicUrl,
                fullPath: data.fullPath,
                fileName,
                originalName: file.name,
                size: file.size,
                type: file.type,
                uploadDate: new Date().toLocaleDateString(),
                status: 'uploaded'
            };

        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    // Handle file upload
    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);

        if (files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            // Process each file
            const uploadPromises = files.map(async (file, index) => {
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
                        [file.name]: Math.min((prev[file.name] || 0) + 20, 90)
                    }));
                }, 200);

                try {
                    // Upload to Supabase
                    const result = await uploadFileToSupabase(file);

                    // Complete progress
                    clearInterval(progressInterval);
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: 100
                    }));

                    return {
                        ...result,
                        id: Date.now() + Math.random() + index
                    };
                } catch (error) {
                    clearInterval(progressInterval);
                    throw error;
                }
            });

            // Wait for all uploads to complete
            const results = await Promise.all(uploadPromises);

            // Add files to uploaded files list
            setUploadedFiles(prev => [...prev, ...results]);

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
            const { error } = await supabase.storage
                .from('uploads')
                .remove([file.path]);

            if (error) {
                throw error;
            }

            // Remove from local state
            setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (error) {
            console.error('Delete failed:', error);
            setUploadError(`Failed to delete ${file.originalName}: ${error.message}`);
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

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
                                <h1 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-900'} bg-clip-text text-transparent`}>
                                    OliveZer0
                                </h1>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Track and manage your carbon footprint</p>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl">
                                        <Factory className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Total Emissions</h3>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>2,847 tCO₂e</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full w-3/4 transition-all duration-1000"></div>
                                    </div>
                                    <span className="text-sm text-red-600 font-medium">+12%</span>
                                </div>
                            </div>

                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl">
                                        <TreePine className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Carbon Offset</h3>
                                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>1,203 tCO₂e</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-emerald-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full w-2/3 transition-all duration-1000"></div>
                                    </div>
                                    <span className="text-sm text-emerald-600 font-medium">+8%</span>
                                </div>
                            </div>

                            <div className={`group ${isDarkMode ? 'bg-gray-800/80 border-gray-700/20 hover:bg-gray-800/90' : 'bg-white/80 border-white/20 hover:bg-white/90'} backdrop-blur-sm p-6 rounded-2xl shadow-lg border hover:shadow-xl hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl">
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
                                    <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
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
                                <h1 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                                    Carbon Analytics
                                </h1>
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
                return (
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                                <FileText className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                                    Invoice Processing
                                </h1>
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

                        {/* Uploaded Files List */}
                        {uploadedFiles.length > 0 && (
                            <div className={`${isDarkMode ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'} backdrop-blur-sm rounded-2xl shadow-lg border overflow-hidden`}>
                                <div className={`p-6 ${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'} border-b`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                            <CheckCircle className="text-white" size={20} />
                                        </div>
                                        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            Uploaded Invoices ({uploadedFiles.length})
                                        </h3>
                                    </div>
                                </div>
                                <div className={`${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'} divide-y`}>
                                    {uploadedFiles.map((file) => (
                                        <div key={file.id} className={`p-6 flex items-center justify-between ${isDarkMode ? 'hover:bg-gradient-to-r hover:from-gray-800 hover:to-blue-900/20' : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50'} transition-all duration-300 group`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 ${isDarkMode ? 'bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-blue-800/50 group-hover:to-indigo-800/50' : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100'} rounded-xl transition-all duration-300`}>
                                                    <File size={24} className={`${isDarkMode ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-blue-600'} transition-colors`} />
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-lg`}>{file.originalName}</p>
                                                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                                        {formatFileSize(file.size)} • Uploaded {file.uploadDate}
                                                    </p>
                                                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                                                        Storage path: {file.path}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle size={14} />
                                                        <span>Uploaded</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => window.open(file.publicUrl, '_blank')}
                                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(file.publicUrl)}
                                                    className={`px-3 py-1 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'} text-white text-sm rounded-lg transition-colors`}
                                                >
                                                    Copy URL
                                                </button>
                                                <button
                                                    onClick={() => deleteFile(file)}
                                                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {uploadedFiles.length === 0 && !isUploading && (
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
                                <h1 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-900 to-gray-600'} bg-clip-text text-transparent`}>
                                    Settings
                                </h1>
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
        <div className={`flex h-screen ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-indigo-100'} transition-colors duration-300 `}>
            {/* Sidebar */}
            <div className={`${isDarkMode ? 'bg-gray-900/90 border-gray-700/20' : 'bg-white/90 border-white/20'} backdrop-blur-xl shadow-2xl transition-all duration-300 ${
                sidebarOpen ? 'w-72' : 'w-20'
            }`}>
                {/* Sidebar Header */}
                <div className={`p-6 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                        {sidebarOpen && (
                            <div className="flex items-center gap-3">
                                <div className="inline-flex p-2.5 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-xl">
                                    <Leaf className="text-white" size={30} />
                                </div>
                                <h2 className={`text-xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-white to-gray-200' : 'from-gray-800 to-gray-900'} bg-clip-text text-transparent`}>
                                    OliveZero
                                </h2>
                            </div>
                        )}
                        <button
                            onClick={toggleSidebar}
                            className={`p-1 rounded-xl ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-all duration-200 hover:scale-110`}
                        >
                            {sidebarOpen ? <Menu size={20} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} /> : <Menu size={25} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />}
                        </button>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="p-3">
                    <ul className="space-y-3">
                        {navItems.map((item) => {
                            const IconComponent = item.icon;
                            const isActive = activeScreen === item.id;

                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleNavClick(item.id)}
                                        className={`w-full flex items-center p-4 rounded-xl transition-all duration-300 group ${
                                            isActive
                                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg scale-105'
                                                : `${isDarkMode ? 'text-gray-400 hover:bg-gradient-to-r hover:from-gray-800 hover:to-blue-900/50 hover:text-white' : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 hover:text-gray-900'} hover:scale-105`
                                        }`}
                                    >
                                        <IconComponent size={22} className="flex-shrink-0" />
                                        {sidebarOpen && (
                                            <span className="ml-4 font-semibold text-lg">{item.label}</span>
                                        )}
                                        {isActive && sidebarOpen && (
                                            <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className= "flex-1 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">


                {/* Main Content */}
                <main className="flex-1 p-8 overflow-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}