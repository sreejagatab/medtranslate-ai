import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF'];

const AnalyticsDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [eventType, setEventType] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [chartData, setChartData] = useState({
    events: [],
    translations: [],
    sessions: [],
    languages: []
  });

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [startDate, endDate, eventType]);

  // Fetch analytics data from API
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (eventType) {
        params.append('eventType', eventType);
      }

      // Fetch data
      const response = await fetch(`${API_URL}/analytics/data?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch analytics data');
      }

      setAnalyticsData(data.data);
      processChartData(data.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const processChartData = (data) => {
    if (!data || !data.events) return;

    // Process events by date
    const eventsByDate = {};
    data.events.forEach(event => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
      eventsByDate[date] = eventsByDate[date] || {};
      eventsByDate[date][event.eventType] = (eventsByDate[date][event.eventType] || 0) + 1;
      eventsByDate[date].total = (eventsByDate[date].total || 0) + 1;
    });

    const eventsData = Object.keys(eventsByDate).map(date => ({
      date,
      ...eventsByDate[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Process translations
    const translationEvents = data.events.filter(event => 
      event.eventType === 'translation_completed' || 
      event.eventType === 'translation_requested'
    );

    const translationsByDate = {};
    translationEvents.forEach(event => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
      translationsByDate[date] = translationsByDate[date] || { date, completed: 0, requested: 0 };
      
      if (event.eventType === 'translation_completed') {
        translationsByDate[date].completed += 1;
      } else {
        translationsByDate[date].requested += 1;
      }
    });

    const translationsData = Object.values(translationsByDate).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Process sessions
    const sessionEvents = data.events.filter(event => 
      event.eventType === 'session_created' || 
      event.eventType === 'session_joined' || 
      event.eventType === 'session_ended'
    );

    const sessionsByDate = {};
    sessionEvents.forEach(event => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
      sessionsByDate[date] = sessionsByDate[date] || { date, created: 0, joined: 0, ended: 0 };
      
      if (event.eventType === 'session_created') {
        sessionsByDate[date].created += 1;
      } else if (event.eventType === 'session_joined') {
        sessionsByDate[date].joined += 1;
      } else if (event.eventType === 'session_ended') {
        sessionsByDate[date].ended += 1;
      }
    });

    const sessionsData = Object.values(sessionsByDate).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Process language pairs
    const languagePairs = {};
    translationEvents.forEach(event => {
      if (event.data && event.data.sourceLanguage && event.data.targetLanguage) {
        const pair = `${event.data.sourceLanguage}-${event.data.targetLanguage}`;
        languagePairs[pair] = (languagePairs[pair] || 0) + 1;
      }
    });

    const languagesData = Object.entries(languagePairs).map(([pair, count]) => ({
      name: pair,
      value: count
    })).sort((a, b) => b.value - a.value);

    setChartData({
      events: eventsData,
      translations: translationsData,
      sessions: sessionsData,
      languages: languagesData
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Reset filters
  const handleResetFilters = () => {
    setStartDate(subDays(new Date(), 7));
    setEndDate(new Date());
    setEventType('');
  };

  // Render loading state
  if (loading && !analyticsData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analytics Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => {
                    setStartDate(newValue);
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => {
                    setEndDate(newValue);
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={eventType}
                  label="Event Type"
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <MenuItem value="">All Events</MenuItem>
                  <MenuItem value="translation_completed">Translation Completed</MenuItem>
                  <MenuItem value="translation_requested">Translation Requested</MenuItem>
                  <MenuItem value="session_created">Session Created</MenuItem>
                  <MenuItem value="session_joined">Session Joined</MenuItem>
                  <MenuItem value="session_ended">Session Ended</MenuItem>
                  <MenuItem value="error">Errors</MenuItem>
                  <MenuItem value="feedback_submitted">Feedback</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={fetchAnalyticsData}
                fullWidth
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetFilters}
                fullWidth
                sx={{ mt: 1 }}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Events
                </Typography>
                <Typography variant="h4">
                  {analyticsData?.totalCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Translations
                </Typography>
                <Typography variant="h4">
                  {analyticsData?.aggregatedData?.eventCounts?.translation_completed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sessions
                </Typography>
                <Typography variant="h4">
                  {analyticsData?.aggregatedData?.sessionCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unique Users
                </Typography>
                <Typography variant="h4">
                  {analyticsData?.aggregatedData?.userCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Paper sx={{ p: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Events" />
            <Tab label="Translations" />
            <Tab label="Sessions" />
            <Tab label="Languages" />
          </Tabs>

          {/* Events Tab */}
          {tabValue === 0 && (
            <Box height={400}>
              <Typography variant="h6" align="center" gutterBottom>
                Events Over Time
              </Typography>
              {chartData.events.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData.events}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8884d8"
                      name="Total Events"
                      strokeWidth={2}
                    />
                    {eventType && (
                      <Line
                        type="monotone"
                        dataKey={eventType}
                        stroke="#82ca9d"
                        name={eventType.replace(/_/g, ' ')}
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="body1" color="textSecondary">
                    No event data available for the selected period
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Translations Tab */}
          {tabValue === 1 && (
            <Box height={400}>
              <Typography variant="h6" align="center" gutterBottom>
                Translations Over Time
              </Typography>
              {chartData.translations.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.translations}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="requested"
                      name="Requested"
                      fill="#8884d8"
                    />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="body1" color="textSecondary">
                    No translation data available for the selected period
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Sessions Tab */}
          {tabValue === 2 && (
            <Box height={400}>
              <Typography variant="h6" align="center" gutterBottom>
                Sessions Over Time
              </Typography>
              {chartData.sessions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.sessions}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="created"
                      name="Created"
                      fill="#8884d8"
                    />
                    <Bar
                      dataKey="joined"
                      name="Joined"
                      fill="#82ca9d"
                    />
                    <Bar
                      dataKey="ended"
                      name="Ended"
                      fill="#ffc658"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="body1" color="textSecondary">
                    No session data available for the selected period
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Languages Tab */}
          {tabValue === 3 && (
            <Box height={400}>
              <Typography variant="h6" align="center" gutterBottom>
                Language Pairs
              </Typography>
              {chartData.languages.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.languages}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.languages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="body1" color="textSecondary">
                    No language data available for the selected period
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Event Details */}
        {analyticsData && (
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Event Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Timestamp</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Event Type</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>User ID</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Session ID</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.events.slice(0, 100).map((event) => (
                    <tr key={event.eventId}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {event.eventType.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {event.userId || '-'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {event.sessionId || '-'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {event.data ? (
                          <details>
                            <summary>View Details</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                              {JSON.stringify(event.data, null, 2)}
                            </pre>
                          </details>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analyticsData.events.length > 100 && (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 2 }}>
                  Showing 100 of {analyticsData.events.length} events
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default AnalyticsDashboard;
