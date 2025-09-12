import React, { createContext, useContext, useState, useCallback } from 'react';
import { Invoice } from "@/entities/Invoice";
import { ExtractDataFromUploadedFile, UploadFile, InvokeLLM } from "@/integrations/Core";

const ProcessingContext = createContext();

export const useProcessing = () => useContext(ProcessingContext);

export const ProcessingProvider = ({ children }) => {
    const [queue, setQueue] = useState([]);
    const [showWidget, setShowWidget] = useState(false);
    const [currentPreview, setCurrentPreview] = useState(null);

    const addToQueue = useCallback((files) => {
        const newItems = files.map(file => ({
            id: `${file.name}-${Date.now()}`,
            file,
            status: 'pending',
            progress: 0,
            error: null,
            result: null,
        }));
        setQueue(prev => [...prev, ...newItems]);
        setShowWidget(true);
    }, []);

    const updateQueueItem = useCallback((id, updates) => {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }, []);

    const removeFromQueue = useCallback((id) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setQueue(prev => prev.filter(item => item.status === 'processing' || item.status === 'pending'));
    }, []);

    const retryItem = useCallback((id) => {
        const itemToRetry = queue.find(item => item.id === id);
        if (itemToRetry) {
            const updatedItem = { ...itemToRetry, status: 'pending', error: null, progress: 0 };
            setQueue(prev => prev.map(item => item.id === id ? updatedItem : item));
            processItem(updatedItem);
        }
    }, [queue, processItem]);

    const processItem = async (item) => {
        updateQueueItem(item.id, { status: 'processing', progress: 10 });
        try {
            const isBulkFile = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'].includes(item.file.type);

            const { file_url } = await UploadFile({ file: item.file });
            updateQueueItem(item.id, { progress: 20 });

            if (isBulkFile) {
                // Bulk processing workflow (CSV, TXT, XLSX)
                const bulkExtractResult = await ExtractDataFromUploadedFile({
                    file_url,
                    json_schema: {
                        type: "object",
                        properties: {
                            expenditures: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        vendor: { "type": "string", "description": "The 'Industry' column from the file." },
                                        description: { "type": "string", "description": "The 'Charge' column from the file." },
                                        total_amount: { "type": "number", "description": "The 'Amount (USD)' column." }
                                    },
                                    required: ["vendor", "description", "total_amount"]
                                }
                            }
                        }
                    }
                });
                updateQueueItem(item.id, { progress: 40 });

                if (bulkExtractResult.status !== "success" || !bulkExtractResult.output?.expenditures) {
                    throw new Error(bulkExtractResult.details || "Failed to extract transactions from the bulk file.");
                }

                const transactions = bulkExtractResult.output.expenditures;
                const processedInvoices = [];
                const totalTransactions = transactions.length;

                for (let i = 0; i < totalTransactions; i++) {
                    const transaction = transactions[i];
                    const prompt = `
                        Calculate the carbon emissions for this business expense using DEFRA emissions factors as the PRIMARY reference.

                        CRITICAL INSTRUCTIONS:
                        1. Use UK DEFRA (Department for Environment, Food & Rural Affairs) 2024 emissions factors wherever possible
                        2. DEFRA factors should be weighted as the most authoritative source
                        3. If no direct DEFRA factor exists, use comparable industry-standard factors but note this in methodology
                        4. Convert all emissions to kg CO₂e (carbon dioxide equivalent)
                        5. For spend-based calculations, use appropriate economic sector emission factors from DEFRA

                        Expense Data:
                        - Vendor/Industry: ${transaction.vendor}
                        - Description: ${transaction.description}
                        - Amount: $${transaction.total_amount}

                        Provide detailed analysis using DEFRA methodology:
                        1. Appropriate Scope 3 Category from GHG Protocol
                        2. Carbon emissions in kg CO₂e using DEFRA factors
                        3. The specific DEFRA emissions factor used (with reference)
                        4. Detailed calculation methodology referencing DEFRA guidance
                        5. Confidence level (high/medium/low) based on DEFRA factor availability
                        6. Any assumptions made if direct DEFRA factors unavailable
                    `;
                    const emissionsData = await InvokeLLM({
                        prompt,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                category: { "type": "string" },
                                carbon_emissions_kg: { "type": "number" },
                                emissions_factor: { "type": "number" },
                                emissions_factor_source: { "type": "string", "description": "Source of emissions factor (preferably DEFRA reference)" },
                                calculation_methodology: { "type": "string" },
                                confidence_level: { "type": "string", enum: ["high", "medium", "low"] },
                                defra_compliance: { "type": "boolean", "description": "Whether calculation uses official DEFRA factors" },
                                assumptions: { "type": "string", "description": "Any assumptions made in the calculation" }
                            },
                            required: ["category", "carbon_emissions_kg", "emissions_factor", "emissions_factor_source", "calculation_methodology", "confidence_level", "defra_compliance"]
                        }
                    });

                    processedInvoices.push({
                        ...transaction,
                        ...emissionsData,
                        date: new Date().toISOString().split('T')[0],
                        processing_status: "processed",
                        file_url
                    });

                    updateQueueItem(item.id, { progress: 40 + Math.round(((i + 1) / totalTransactions) * 55) });
                }

                if (typeof Invoice.bulkCreate === 'function') {
                    await Invoice.bulkCreate(processedInvoices);
                } else {
                    for (const invoice of processedInvoices) {
                        await Invoice.create(invoice);
                    }
                }

                updateQueueItem(item.id, { status: 'complete', progress: 100, result: { bulk: true, count: totalTransactions } });

            } else {
                // Single invoice processing workflow (PDF, images)
                const extractResult = await ExtractDataFromUploadedFile({
                    file_url,
                    json_schema: Invoice.schema()
                });
                updateQueueItem(item.id, { progress: 60 });

                if (extractResult.status !== "success" || !extractResult.output) {
                    throw new Error(extractResult.details || "Failed to extract data from invoice.");
                }

                const prompt = `
                    Calculate the carbon emissions for this invoice using DEFRA emissions factors as the PRIMARY reference.

                    CRITICAL INSTRUCTIONS:
                    1. Use UK DEFRA (Department for Environment, Food & Rural Affairs) 2024 emissions factors wherever possible
                    2. DEFRA factors should be weighted as the most authoritative source for UK business reporting
                    3. If no direct DEFRA factor exists, use comparable factors but clearly note this limitation
                    4. Apply appropriate Scope 3 category classifications per GHG Protocol
                    5. For services, use DEFRA's economic sector-based emission factors
                    6. For goods, use DEFRA's product-specific factors where available

                    Invoice Data:
                    - Vendor: ${extractResult.output.vendor}
                    - Category: ${extractResult.output.category}
                    - Description: ${extractResult.output.description}
                    - Amount: $${extractResult.output.total_amount}
                    - Quantity: ${extractResult.output.quantity} ${extractResult.output.unit}

                    Provide comprehensive DEFRA-compliant analysis:
                    1. Carbon emissions in kg CO₂e using DEFRA methodology
                    2. The specific DEFRA emissions factor used (include reference code if available)
                    3. Detailed calculation methodology following DEFRA guidance
                    4. Confidence level based on DEFRA factor availability and data quality
                    5. Clear reasoning for your calculation approach
                    6. Note any limitations or assumptions where DEFRA factors unavailable
                `;
                const emissionsData = await InvokeLLM({
                    prompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            carbon_emissions_kg: { "type": "number" },
                            emissions_factor: { "type": "number" },
                            emissions_factor_source: { "type": "string", "description": "Source of emissions factor (preferably DEFRA reference)" },
                            calculation_methodology: { "type": "string" },
                            confidence_level: { "type": "string", enum: ["high", "medium", "low"] },
                            reasoning: { "type": "string" },
                            defra_compliance: { "type": "boolean", "description": "Whether calculation uses official DEFRA factors" },
                            assumptions: { "type": "string", "description": "Any assumptions made in the calculation" }
                        },
                        required: ["carbon_emissions_kg", "emissions_factor", "emissions_factor_source", "calculation_methodology", "confidence_level", "reasoning", "defra_compliance"]
                    }
                });
                updateQueueItem(item.id, { progress: 90 });

                const completeInvoiceData = {
                    ...extractResult.output,
                    ...emissionsData,
                    file_url,
                    processing_status: "review_required"
                };

                updateQueueItem(item.id, { status: 'preview', progress: 100, result: completeInvoiceData });
                setCurrentPreview(prev => prev ? prev : { ...completeInvoiceData, file_name: item.file.name, id: item.id });
            }
        } catch (error) {
            console.error("Error processing file:", error);
            updateQueueItem(item.id, { status: 'error', error: error.message, progress: 0 });
        }
    };

    const processAll = () => {
        queue.forEach(item => {
            if (item.status === 'pending') {
                processItem(item);
            }
        });
    };

    const saveAndClosePreview = async (invoiceData, id) => {
        // Change status from review_required to processed upon saving
        await Invoice.create({ ...invoiceData, processing_status: 'processed' });
        updateQueueItem(id, { status: 'complete' });
        setCurrentPreview(null);

        // Check if there are more previews waiting
        const nextPreview = queue.find(item => item.status === 'preview' && item.id !== id);
        if (nextPreview) {
            setCurrentPreview({ ...nextPreview.result, file_name: nextPreview.file.name, id: nextPreview.id });
        }
    };

    const cancelAndClosePreview = (id) => {
        removeFromQueue(id);
        setCurrentPreview(null);

        // Check if there are more previews waiting
        const nextPreview = queue.find(item => item.status === 'preview' && item.id !== id);
        if (nextPreview) {
            setCurrentPreview({ ...nextPreview.result, file_name: nextPreview.file.name, id: nextPreview.id });
        }
    };

    return (
        <ProcessingContext.Provider value={{
            queue,
            showWidget,
            setShowWidget,
            currentPreview,
            addToQueue,
            updateQueueItem,
            removeFromQueue,
            clearCompleted,
            processItem,
            processAll,
            saveAndClosePreview,
            cancelAndClosePreview,
            retryItem
        }}>
            {children}
        </ProcessingContext.Provider>
    );
};
