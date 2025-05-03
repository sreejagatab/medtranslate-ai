/**
 * Feedback Analysis Dashboard for MedTranslate AI
 * 
 * This component displays feedback statistics and analysis,
 * including translation quality feedback and confidence threshold adjustments.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Box
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import DatePicker from '@mui/lab/DatePicker';
import { format } from 'date-fns';
import { getTranslationFeedbackStats } from '../services/feedback-service';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const RATING_COLORS = {
  1: '#FF5252',
  2: '#FF9800',
  3: '#FFC107',
  4: '#8BC34A',
  5: '#4CAF50'
};

export default function FeedbackAnalysisDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
    context: 'all'
  });

  // Load feedback statistics
  useEffect(() => {
    fetchFeedbackStats();
  }, [filters]);

  // Fetch feedback statistics
  const fetchFeedbackStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = {
        startDate: format(filters.startDate, 'yyyy-MM-dd'),
        endDate: format(filters.endDate, 'yyyy-MM-dd')
      };

      const response = await getTranslationFeedbackStats(queryParams);
      setStats(response);
    } catch (error) {
      console.error('Error fetching feedback statistics:', error);
      setError('Failed to load feedback statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value
    });
  };

  // Prepare data for rating distribution chart
  const prepareRatingData = () => {
    if (!stats || !stats.byRating) return [];

    return Object.entries(stats.byRating).map(([rating, count]) => ({
      name: `${rating} Star${rating === '1' ? '' : 's'}`,
      value: count,
      rating: parseInt(rating)
    }));
  };

  // Prepare data for context comparison chart
  const prepareContextData = () => {
    if (!stats || !stats.byContext) return [];

    return Object.entries(stats.byContext)
      .filter(([context]) => filters.context === 'all' || context === filters.context)
      .map(([context, data]) => ({
        name: context,
        averageRating: parseFloat(data.averageRating.toFixed(2)),
        total: data.total
      }))
      .sort((a, b) => b.averageRating - a.averageRating);
  };

  // Prepare data for language pair comparison chart
  const prepareLanguagePairData = () => {
    if (!stats || !stats.byLanguagePair) return [];

    return Object.entries(stats.byLanguagePair)
      .map(([pair, data]) => ({
        name: pair,
        averageRating: parseFloat(data.averageRating.toFixed(2)),
        total: data.total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 language pairs
  };

  // Prepare data for issue types chart
  const prepareIssueData = () => {
    if (!stats || !stats.byIssue) return [];

    return Object.entries(stats.byIssue)
      .map(([issue, count]) => ({
        name: issue.replace(/_/g, ' '),
        value: count
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Translation Feedback Analysis
      </Typography>

      {/* Filters */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Medical Context</InputLabel>
              <Select
                value={filters.context}
                label="Medical Context"
                onChange={(e) => handleFilterChange('context', e.target.value)}
              >
                <MenuItem value="all">All Contexts</MenuItem>
                {stats && stats.byContext && Object.keys(stats.byContext).map((context) => (
                  <MenuItem key={context} value={context}>
                    {context}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth
              onClick={fetchFeedbackStats}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Total Feedback
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {stats?.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Average Rating
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Positive Feedback
              </Typography>
              <Typography variant="h3" component="div" color="primary">
                {stats?.byRating ? 
                  `${Math.round((stats.byRating[4] + stats.byRating[5]) / stats.total * 100)}%` : 
                  'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Negative Feedback
              </Typography>
              <Typography variant="h3" component="div" color="error">
                {stats?.byRating ? 
                  `${Math.round((stats.byRating[1] + stats.byRating[2]) / stats.total * 100)}%` : 
                  'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={4}>
        {/* Rating Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rating Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareRatingData()}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prepareRatingData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.rating]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} feedback(s)`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Issue Types */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Common Issues
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={prepareIssueData()}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Medical Context Comparison */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Medical Context Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={prepareContextData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="averageRating" name="Average Rating" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="total" name="Total Feedback" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Language Pair Comparison */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Language Pairs
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={prepareLanguagePairData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="averageRating" name="Average Rating" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="total" name="Total Feedback" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
