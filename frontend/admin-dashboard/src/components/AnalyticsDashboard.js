import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Spinner,
  Tabs,
  Tab,
  Alert,
  Dropdown,
  OverlayTrigger,
  Tooltip as BSTooltip,
  Badge,
  Modal
} from 'react-bootstrap';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'https://api.medtranslate.ai';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard = () => {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [component, setComponent] = useState('all');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Analytics data
  const [translationData, setTranslationData] = useState([]);
  const [sessionData, setSessionData] = useState([]);
  const [errorData, setErrorData] = useState([]);
  const [performanceData, setPerformanceData] = useState({
    responseTime: [],
    errors: [],
    successRate: []
  });

  // Enhanced analytics data
  const [userBehaviorData, setUserBehaviorData] = useState([]);
  const [usagePatternData, setUsagePatternData] = useState([]);
  const [offlineUsageData, setOfflineUsageData] = useState([]);
  const [qualityFeedbackData, setQualityFeedbackData] = useState([]);
  const [deviceDistributionData, setDeviceDistributionData] = useState([]);

  // Refs for charts (used for export)
  const chartsRef = useRef({});

  // Fetch data on component mount and when date range changes
  useEffect(() => {
    fetchData();

    // Clean up any existing interval
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [startDate, endDate, component]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (refreshInterval) {
      const intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);

      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, startDate, endDate, component]);

  // Fetch analytics data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch translation data
      const translationResponse = await fetch(`${API_URL}/admin/analytics/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventType: 'translation',
          groupBy: 'source_language'
        })
      });

      if (!translationResponse.ok) {
        throw new Error('Failed to fetch translation data');
      }

      const translationResult = await translationResponse.json();
      setTranslationData(translationResult.data);

      // Fetch session data
      const sessionResponse = await fetch(`${API_URL}/admin/analytics/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventType: 'session_create',
          groupBy: 'medical_context'
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session data');
      }

      const sessionResult = await sessionResponse.json();
      setSessionData(sessionResult.data);

      // Fetch error data
      const errorResponse = await fetch(`${API_URL}/admin/analytics/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventType: 'error',
          groupBy: 'error_type'
        })
      });

      if (!errorResponse.ok) {
        throw new Error('Failed to fetch error data');
      }

      const errorResult = await errorResponse.json();
      setErrorData(errorResult.data);

      // Fetch performance data
      const performanceResponse = await fetch(`${API_URL}/admin/analytics/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          component: component === 'all' ? null : component
        })
      });

      if (!performanceResponse.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const performanceResult = await performanceResponse.json();
      setPerformanceData(performanceResult);

      // Fetch enhanced analytics data

      // 1. User behavior data
      const userBehaviorResponse = await fetch(`${API_URL}/admin/analytics/user-behavior`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (userBehaviorResponse.ok) {
        const userBehaviorResult = await userBehaviorResponse.json();
        setUserBehaviorData(userBehaviorResult.data || []);
      }

      // 2. Usage pattern data
      const usagePatternResponse = await fetch(`${API_URL}/admin/analytics/usage-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (usagePatternResponse.ok) {
        const usagePatternResult = await usagePatternResponse.json();
        setUsagePatternData(usagePatternResult.data || []);
      }

      // 3. Offline usage data
      const offlineUsageResponse = await fetch(`${API_URL}/admin/analytics/offline-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (offlineUsageResponse.ok) {
        const offlineUsageResult = await offlineUsageResponse.json();
        setOfflineUsageData(offlineUsageResult.data || []);
      }

      // 4. Quality feedback data
      const qualityFeedbackResponse = await fetch(`${API_URL}/admin/analytics/quality-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (qualityFeedbackResponse.ok) {
        const qualityFeedbackResult = await qualityFeedbackResponse.json();
        setQualityFeedbackData(qualityFeedbackResult.data || []);
      }

      // 5. Device distribution data
      const deviceDistributionResponse = await fetch(`${API_URL}/admin/analytics/device-distribution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (deviceDistributionResponse.ok) {
        const deviceDistributionResult = await deviceDistributionResponse.json();
        setDeviceDistributionData(deviceDistributionResult.data || []);
      }

      // Update last updated timestamp
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Process translation data for charts
  const processTranslationData = () => {
    if (!translationData || Object.keys(translationData).length === 0) {
      return [];
    }

    return Object.keys(translationData).map(language => ({
      name: language,
      count: translationData[language].length,
      successRate: calculateSuccessRate(translationData[language]),
      avgProcessingTime: calculateAvgProcessingTime(translationData[language])
    }));
  };

  // Calculate success rate for translations
  const calculateSuccessRate = (items) => {
    if (!items || items.length === 0) return 0;

    const successCount = items.filter(item => item.success).length;
    return (successCount / items.length) * 100;
  };

  // Calculate average processing time for translations
  const calculateAvgProcessingTime = (items) => {
    if (!items || items.length === 0) return 0;

    const totalTime = items.reduce((sum, item) => sum + (item.processing_time || 0), 0);
    return totalTime / items.length;
  };

  // Process session data for charts
  const processSessionData = () => {
    if (!sessionData || Object.keys(sessionData).length === 0) {
      return [];
    }

    return Object.keys(sessionData).map(context => ({
      name: context,
      count: sessionData[context].length
    }));
  };

  // Process error data for charts
  const processErrorData = () => {
    if (!errorData || Object.keys(errorData).length === 0) {
      return [];
    }

    return Object.keys(errorData).map(errorType => ({
      name: errorType,
      count: errorData[errorType].length
    }));
  };

  // Process performance data for charts
  const processPerformanceData = () => {
    if (!performanceData || !performanceData.responseTime) {
      return {
        responseTime: [],
        errors: [],
        successRate: []
      };
    }

    // Format response time data
    const responseTimeData = performanceData.responseTime.map(point => ({
      time: new Date(point.Timestamp).toLocaleString(),
      avg: point.Average,
      max: point.Maximum,
      min: point.Minimum
    }));

    // Format error data
    const errorData = performanceData.errors.map(point => ({
      time: new Date(point.Timestamp).toLocaleString(),
      count: point.Sum
    }));

    // Format success rate data
    const successRateData = performanceData.successRate.map(point => ({
      time: new Date(point.Timestamp).toLocaleString(),
      rate: point.Average
    }));

    return {
      responseTime: responseTimeData,
      errors: errorData,
      successRate: successRateData
    };
  };

  // Process user behavior data for charts
  const processUserBehaviorData = () => {
    if (!userBehaviorData || userBehaviorData.length === 0) {
      return {
        sessionDuration: [],
        userPaths: [],
        featureUsage: []
      };
    }

    // Format session duration data
    const sessionDurationData = userBehaviorData
      .filter(item => item.sessionDuration)
      .map(item => ({
        userId: item.userId || 'Anonymous',
        userType: item.userType || 'Unknown',
        duration: item.sessionDuration,
        date: new Date(item.timestamp).toLocaleDateString()
      }));

    // Format user paths data (most common navigation paths)
    const userPathsData = userBehaviorData
      .filter(item => item.navigationPath && item.navigationPath.length > 0)
      .reduce((acc, item) => {
        const pathString = item.navigationPath.join(' → ');
        const existingPath = acc.find(p => p.path === pathString);

        if (existingPath) {
          existingPath.count += 1;
        } else {
          acc.push({
            path: pathString,
            count: 1,
            userType: item.userType || 'Unknown'
          });
        }

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Format feature usage data
    const featureUsageData = userBehaviorData
      .filter(item => item.featuresUsed && item.featuresUsed.length > 0)
      .reduce((acc, item) => {
        item.featuresUsed.forEach(feature => {
          const existingFeature = acc.find(f => f.name === feature);

          if (existingFeature) {
            existingFeature.count += 1;
          } else {
            acc.push({
              name: feature,
              count: 1
            });
          }
        });

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    return {
      sessionDuration: sessionDurationData,
      userPaths: userPathsData,
      featureUsage: featureUsageData
    };
  };

  // Process usage pattern data for charts
  const processUsagePatternData = () => {
    if (!usagePatternData || usagePatternData.length === 0) {
      return {
        hourlyUsage: [],
        weeklyUsage: [],
        userRetention: []
      };
    }

    // Format hourly usage data
    const hourlyUsageMap = new Map();
    for (let i = 0; i < 24; i++) {
      hourlyUsageMap.set(i, 0);
    }

    usagePatternData.forEach(item => {
      if (item.timestamp) {
        const hour = new Date(item.timestamp).getHours();
        hourlyUsageMap.set(hour, hourlyUsageMap.get(hour) + 1);
      }
    });

    const hourlyUsageData = Array.from(hourlyUsageMap.entries()).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count
    }));

    // Format weekly usage data
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyUsageMap = new Map();
    for (let i = 0; i < 7; i++) {
      weeklyUsageMap.set(i, 0);
    }

    usagePatternData.forEach(item => {
      if (item.timestamp) {
        const day = new Date(item.timestamp).getDay();
        weeklyUsageMap.set(day, weeklyUsageMap.get(day) + 1);
      }
    });

    const weeklyUsageData = Array.from(weeklyUsageMap.entries()).map(([day, count]) => ({
      day: weekdayNames[day],
      count
    }));

    // Format user retention data (if available)
    const userRetentionData = usagePatternData
      .filter(item => item.retentionData)
      .map(item => ({
        cohort: item.cohortDate || 'Unknown',
        day1: item.retentionData.day1 || 0,
        day7: item.retentionData.day7 || 0,
        day30: item.retentionData.day30 || 0
      }));

    return {
      hourlyUsage: hourlyUsageData,
      weeklyUsage: weeklyUsageData,
      userRetention: userRetentionData
    };
  };

  // Process offline usage data for charts
  const processOfflineUsageData = () => {
    if (!offlineUsageData || offlineUsageData.length === 0) {
      return {
        offlineFrequency: [],
        offlineDuration: [],
        cacheHitRate: [],
        predictiveAccuracy: []
      };
    }

    // Format offline frequency data
    const offlineFrequencyData = offlineUsageData
      .filter(item => item.offlineCount !== undefined)
      .map(item => ({
        date: new Date(item.date).toLocaleDateString(),
        count: item.offlineCount
      }));

    // Format offline duration data
    const offlineDurationData = offlineUsageData
      .filter(item => item.averageOfflineDuration !== undefined)
      .map(item => ({
        date: new Date(item.date).toLocaleDateString(),
        duration: item.averageOfflineDuration
      }));

    // Format cache hit rate data
    const cacheHitRateData = offlineUsageData
      .filter(item => item.cacheHitRate !== undefined)
      .map(item => ({
        date: new Date(item.date).toLocaleDateString(),
        rate: item.cacheHitRate * 100
      }));

    // Format predictive accuracy data
    const predictiveAccuracyData = offlineUsageData
      .filter(item => item.predictiveAccuracy !== undefined)
      .map(item => ({
        date: new Date(item.date).toLocaleDateString(),
        accuracy: item.predictiveAccuracy * 100
      }));

    return {
      offlineFrequency: offlineFrequencyData,
      offlineDuration: offlineDurationData,
      cacheHitRate: cacheHitRateData,
      predictiveAccuracy: predictiveAccuracyData
    };
  };

  // Process quality feedback data for charts
  const processQualityFeedbackData = () => {
    if (!qualityFeedbackData || qualityFeedbackData.length === 0) {
      return {
        ratings: [],
        feedbackCategories: [],
        languagePairs: []
      };
    }

    // Format ratings data
    const ratingsMap = new Map();
    for (let i = 1; i <= 5; i++) {
      ratingsMap.set(i, 0);
    }

    qualityFeedbackData.forEach(item => {
      if (item.rating) {
        ratingsMap.set(item.rating, ratingsMap.get(item.rating) + 1);
      }
    });

    const ratingsData = Array.from(ratingsMap.entries()).map(([rating, count]) => ({
      rating: `${rating} Star${rating !== 1 ? 's' : ''}`,
      count
    }));

    // Format feedback categories data
    const feedbackCategoriesData = qualityFeedbackData
      .filter(item => item.category)
      .reduce((acc, item) => {
        const existingCategory = acc.find(c => c.name === item.category);

        if (existingCategory) {
          existingCategory.count += 1;
        } else {
          acc.push({
            name: item.category,
            count: 1
          });
        }

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    // Format language pairs data
    const languagePairsData = qualityFeedbackData
      .filter(item => item.sourceLanguage && item.targetLanguage)
      .reduce((acc, item) => {
        const pair = `${item.sourceLanguage} → ${item.targetLanguage}`;
        const existingPair = acc.find(p => p.pair === pair);

        if (existingPair) {
          existingPair.count += 1;
          existingPair.avgRating = (existingPair.avgRating * existingPair.count + item.rating) / (existingPair.count + 1);
        } else {
          acc.push({
            pair,
            count: 1,
            avgRating: item.rating || 0
          });
        }

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    return {
      ratings: ratingsData,
      feedbackCategories: feedbackCategoriesData,
      languagePairs: languagePairsData
    };
  };

  // Process device distribution data for charts
  const processDeviceDistributionData = () => {
    if (!deviceDistributionData || deviceDistributionData.length === 0) {
      return {
        deviceTypes: [],
        operatingSystems: [],
        browsers: []
      };
    }

    // Format device types data
    const deviceTypesData = deviceDistributionData
      .filter(item => item.deviceType)
      .reduce((acc, item) => {
        const existingType = acc.find(t => t.name === item.deviceType);

        if (existingType) {
          existingType.count += 1;
        } else {
          acc.push({
            name: item.deviceType,
            count: 1
          });
        }

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    // Format operating systems data
    const operatingSystemsData = deviceDistributionData
      .filter(item => item.os)
      .reduce((acc, item) => {
        const existingOS = acc.find(os => os.name === item.os);

        if (existingOS) {
          existingOS.count += 1;
        } else {
          acc.push({
            name: item.os,
            count: 1
          });
        }

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    // Format browsers data
    const browsersData = deviceDistributionData
      .filter(item => item.browser)
      .reduce((acc, item) => {
        const existingBrowser = acc.find(b => b.name === item.browser);

        if (existingBrowser) {
          existingBrowser.count += 1;
        } else {
          acc.push({
            name: item.browser,
            count: 1
          });
        }

        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    return {
      deviceTypes: deviceTypesData,
      operatingSystems: operatingSystemsData,
      browsers: browsersData
    };
  };

  // Export data to CSV or Excel
  const exportData = async () => {
    setShowExportModal(true);
    setExportProgress(0);
    setExportStatus('Preparing data for export...');

    try {
      // Process all data
      setExportProgress(10);
      setExportStatus('Processing translation data...');
      const translationChartData = processTranslationData();

      setExportProgress(20);
      setExportStatus('Processing session data...');
      const sessionChartData = processSessionData();

      setExportProgress(30);
      setExportStatus('Processing error data...');
      const errorChartData = processErrorData();

      setExportProgress(40);
      setExportStatus('Processing performance data...');
      const performanceChartData = processPerformanceData();

      setExportProgress(50);
      setExportStatus('Processing user behavior data...');
      const userBehaviorChartData = processUserBehaviorData();

      setExportProgress(60);
      setExportStatus('Processing usage pattern data...');
      const usagePatternChartData = processUsagePatternData();

      setExportProgress(70);
      setExportStatus('Processing offline usage data...');
      const offlineUsageChartData = processOfflineUsageData();

      setExportProgress(80);
      setExportStatus('Processing quality feedback data...');
      const qualityFeedbackChartData = processQualityFeedbackData();

      setExportProgress(90);
      setExportStatus('Processing device distribution data...');
      const deviceDistributionChartData = processDeviceDistributionData();

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add sheets for each data type
      if (translationChartData.length > 0) {
        const translationWs = XLSX.utils.json_to_sheet(translationChartData);
        XLSX.utils.book_append_sheet(wb, translationWs, 'Translations');
      }

      if (sessionChartData.length > 0) {
        const sessionWs = XLSX.utils.json_to_sheet(sessionChartData);
        XLSX.utils.book_append_sheet(wb, sessionWs, 'Sessions');
      }

      if (errorChartData.length > 0) {
        const errorWs = XLSX.utils.json_to_sheet(errorChartData);
        XLSX.utils.book_append_sheet(wb, errorWs, 'Errors');
      }

      if (performanceChartData.responseTime.length > 0) {
        const responseTimeWs = XLSX.utils.json_to_sheet(performanceChartData.responseTime);
        XLSX.utils.book_append_sheet(wb, responseTimeWs, 'Response Time');
      }

      if (userBehaviorChartData.sessionDuration.length > 0) {
        const sessionDurationWs = XLSX.utils.json_to_sheet(userBehaviorChartData.sessionDuration);
        XLSX.utils.book_append_sheet(wb, sessionDurationWs, 'Session Duration');
      }

      if (userBehaviorChartData.featureUsage.length > 0) {
        const featureUsageWs = XLSX.utils.json_to_sheet(userBehaviorChartData.featureUsage);
        XLSX.utils.book_append_sheet(wb, featureUsageWs, 'Feature Usage');
      }

      if (usagePatternChartData.hourlyUsage.length > 0) {
        const hourlyUsageWs = XLSX.utils.json_to_sheet(usagePatternChartData.hourlyUsage);
        XLSX.utils.book_append_sheet(wb, hourlyUsageWs, 'Hourly Usage');
      }

      if (usagePatternChartData.weeklyUsage.length > 0) {
        const weeklyUsageWs = XLSX.utils.json_to_sheet(usagePatternChartData.weeklyUsage);
        XLSX.utils.book_append_sheet(wb, weeklyUsageWs, 'Weekly Usage');
      }

      if (offlineUsageChartData.offlineFrequency.length > 0) {
        const offlineFrequencyWs = XLSX.utils.json_to_sheet(offlineUsageChartData.offlineFrequency);
        XLSX.utils.book_append_sheet(wb, offlineFrequencyWs, 'Offline Frequency');
      }

      if (qualityFeedbackChartData.ratings.length > 0) {
        const ratingsWs = XLSX.utils.json_to_sheet(qualityFeedbackChartData.ratings);
        XLSX.utils.book_append_sheet(wb, ratingsWs, 'Ratings');
      }

      if (deviceDistributionChartData.deviceTypes.length > 0) {
        const deviceTypesWs = XLSX.utils.json_to_sheet(deviceDistributionChartData.deviceTypes);
        XLSX.utils.book_append_sheet(wb, deviceTypesWs, 'Device Types');
      }

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `medtranslate_analytics_${dateStr}`;

      setExportProgress(95);
      setExportStatus('Generating file...');

      // Export based on format
      if (exportFormat === 'xlsx') {
        // Export to Excel
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${filename}.xlsx`);
      } else if (exportFormat === 'csv') {
        // Export to CSV (first sheet only)
        const firstSheetName = wb.SheetNames[0];
        const csvContent = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `${filename}_${firstSheetName}.csv`);
      } else if (exportFormat === 'json') {
        // Export to JSON
        const jsonData = {};
        wb.SheetNames.forEach(sheetName => {
          jsonData[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        });
        const jsonContent = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        saveAs(blob, `${filename}.json`);
      }

      setExportProgress(100);
      setExportStatus('Export completed successfully!');

      // Close modal after a delay
      setTimeout(() => {
        setShowExportModal(false);
      }, 1500);
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportStatus(`Export failed: ${error.message}`);
    }
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = (interval) => {
    if (refreshInterval === interval) {
      setRefreshInterval(null);
    } else {
      setRefreshInterval(interval);
    }
  };

  // Render loading spinner
  if (isLoading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading analytics data...</p>
        </div>
      </Container>
    );
  }

  // Process data for charts
  const translationChartData = processTranslationData();
  const sessionChartData = processSessionData();
  const errorChartData = processErrorData();
  const performanceChartData = processPerformanceData();
  const userBehaviorChartData = processUserBehaviorData();
  const usagePatternChartData = processUsagePatternData();
  const offlineUsageChartData = processOfflineUsageData();
  const qualityFeedbackChartData = processQualityFeedbackData();
  const deviceDistributionChartData = processDeviceDistributionData();

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h1 className="mb-0">Analytics Dashboard</h1>
        </Col>
        <Col xs="auto">
          <div className="d-flex align-items-center">
            {lastUpdated && (
              <small className="text-muted me-3">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            )}

            <Dropdown className="me-2">
              <Dropdown.Toggle variant="outline-secondary" id="refresh-dropdown">
                <i className="bi bi-arrow-clockwise me-1"></i>
                {refreshInterval ? `Auto (${refreshInterval}s)` : 'Refresh'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => fetchData()}>
                  Refresh Now
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  onClick={() => toggleAutoRefresh(30)}
                  active={refreshInterval === 30}
                >
                  Auto (30s)
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => toggleAutoRefresh(60)}
                  active={refreshInterval === 60}
                >
                  Auto (1m)
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => toggleAutoRefresh(300)}
                  active={refreshInterval === 300}
                >
                  Auto (5m)
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => toggleAutoRefresh(null)}
                  active={refreshInterval === null}
                >
                  Off
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <Dropdown className="me-2">
              <Dropdown.Toggle variant="outline-primary" id="export-dropdown">
                <i className="bi bi-download me-1"></i>
                Export
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={() => { setExportFormat('xlsx'); exportData(); }}
                >
                  Export as Excel (.xlsx)
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => { setExportFormat('csv'); exportData(); }}
                >
                  Export as CSV (.csv)
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => { setExportFormat('json'); exportData(); }}
                >
                  Export as JSON (.json)
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger">
          Error: {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <DatePicker
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <DatePicker
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Component</Form.Label>
                <Form.Select
                  value={component}
                  onChange={e => setComponent(e.target.value)}
                >
                  <option value="all">All Components</option>
                  <option value="backend">Backend</option>
                  <option value="edge">Edge Device</option>
                  <option value="provider-app">Provider App</option>
                  <option value="patient-app">Patient App</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Button variant="primary" onClick={fetchData}>
            Update
          </Button>
        </Card.Body>
      </Card>

      {/* Export Progress Modal */}
      <Modal show={showExportModal} backdrop="static" keyboard={false} centered>
        <Modal.Header>
          <Modal.Title>Exporting Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{exportStatus}</p>
          <div className="progress mb-3">
            <div
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ width: `${exportProgress}%` }}
              aria-valuenow={exportProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          {exportProgress === 100 && (
            <Alert variant="success">
              Export completed successfully!
            </Alert>
          )}
        </Modal.Body>
      </Modal>

      <Tabs
        activeKey={activeTab}
        onSelect={k => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Total Translations</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {translationChartData.reduce((sum, item) => sum + item.count, 0)}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Total Sessions</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {sessionChartData.reduce((sum, item) => sum + item.count, 0)}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Success Rate</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {translationChartData.length > 0
                      ? `${(translationChartData.reduce((sum, item) => sum + item.successRate, 0) / translationChartData.length).toFixed(1)}%`
                      : 'N/A'}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Total Errors</Card.Title>
                  <h2 className="mt-3 mb-0">
                    {errorChartData.reduce((sum, item) => sum + item.count, 0)}
                  </h2>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Translations by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#0088FE" name="Translations" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Sessions by Medical Context</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sessionChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {sessionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="translations" title="Translations">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Translation Success Rate by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="successRate" fill="#00C49F" name="Success Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Average Processing Time by Language</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={translationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgProcessingTime" fill="#FFBB28" name="Avg. Processing Time (ms)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="performance" title="Performance">
          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Response Time</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceChartData.responseTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avg" stroke="#0088FE" name="Average (ms)" />
                      <Line type="monotone" dataKey="max" stroke="#FF8042" name="Maximum (ms)" />
                      <Line type="monotone" dataKey="min" stroke="#00C49F" name="Minimum (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Error Count</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceChartData.errors}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#FF8042" name="Errors" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Success Rate</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceChartData.successRate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="rate" stroke="#00C49F" name="Success Rate (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="errors" title="Errors">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Errors by Type</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={errorChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#FF8042" name="Error Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Error Distribution</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={errorChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {errorChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="user-behavior" title="User Behavior">
          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Session Duration by User Type</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis
                        type="category"
                        dataKey="userType"
                        name="User Type"
                      />
                      <YAxis
                        type="number"
                        dataKey="duration"
                        name="Duration (seconds)"
                        unit="s"
                      />
                      <ZAxis
                        type="number"
                        dataKey="duration"
                        range={[50, 500]}
                        name="Duration"
                        unit="s"
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Legend />
                      <Scatter
                        name="Session Duration"
                        data={userBehaviorChartData.sessionDuration}
                        fill="#8884d8"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Most Used Features</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={userBehaviorChartData.featureUsage}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        fill="#82ca9d"
                        name="Usage Count"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Common Navigation Paths</Card.Title>
                  <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Path</th>
                          <th>Count</th>
                          <th>User Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userBehaviorChartData.userPaths.map((path, index) => (
                          <tr key={index}>
                            <td>{path.path}</td>
                            <td>{path.count}</td>
                            <td>{path.userType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="usage-patterns" title="Usage Patterns">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Hourly Usage Distribution</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usagePatternChartData.hourlyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Usage Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Weekly Usage Distribution</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={usagePatternChartData.weeklyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#82ca9d" name="Usage Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {usagePatternChartData.userRetention.length > 0 && (
            <Row>
              <Col lg={12} className="mb-4">
                <Card>
                  <Card.Body>
                    <Card.Title>User Retention by Cohort</Card.Title>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={usagePatternChartData.userRetention}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cohort" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="day1" fill="#0088FE" name="Day 1 Retention (%)" />
                        <Bar dataKey="day7" fill="#00C49F" name="Day 7 Retention (%)" />
                        <Bar dataKey="day30" fill="#FFBB28" name="Day 30 Retention (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Tab>

        <Tab eventKey="offline-usage" title="Offline Usage">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Offline Frequency</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={offlineUsageChartData.offlineFrequency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        name="Offline Events"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Average Offline Duration</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={offlineUsageChartData.offlineDuration}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="duration"
                        stroke="#82ca9d"
                        name="Duration (minutes)"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Cache Hit Rate</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={offlineUsageChartData.cacheHitRate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                        name="Hit Rate (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Predictive Caching Accuracy</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={offlineUsageChartData.predictiveAccuracy}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.3}
                        name="Accuracy (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="quality-feedback" title="Quality Feedback">
          <Row>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Translation Ratings Distribution</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={qualityFeedbackChartData.ratings}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="count"
                        fill="#8884d8"
                        name="Count"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Feedback Categories</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={qualityFeedbackChartData.feedbackCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {qualityFeedbackChartData.feedbackCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col lg={12} className="mb-4">
              <Card>
                <Card.Body>
                  <Card.Title>Language Pair Performance</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={qualityFeedbackChartData.languagePairs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="pair" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="count"
                        fill="#8884d8"
                        name="Usage Count"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="avgRating"
                        fill="#82ca9d"
                        name="Avg. Rating (1-5)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="devices" title="Devices">
          <Row>
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Device Types</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deviceDistributionChartData.deviceTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {deviceDistributionChartData.deviceTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Operating Systems</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deviceDistributionChartData.operatingSystems}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {deviceDistributionChartData.operatingSystems.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>Browsers</Card.Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deviceDistributionChartData.browsers}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {deviceDistributionChartData.browsers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AnalyticsDashboard;
