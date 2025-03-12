import React, { useEffect, useState } from "react";
import { getToken } from "../../utils/helper";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, CircularProgress, TextField } from "@mui/material";
import axios from "axios";

const SalesChart = () => {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${getToken()}` },
        };

        // Prepare query parameters for the date range
        const queryParams = {};
        if (startDate) queryParams.startDate = startDate;
        if (endDate) queryParams.endDate = endDate;

        const response = await axios.get(
          `http://localhost:4000/api/v1/sales`,
          config
        );

        let salesChart = response.data.salesChart || [];

        const allDays = generateDateRange(startDate, endDate);

        const filledSalesData = allDays.map((day) => {
          const daySales = salesChart.find((item) => item.day === day);
          return { day, sales: daySales ? daySales.sales : 0 };
        });

        setSalesData(filledSalesData);
      } catch (err) {
        setError("Failed to fetch sales data");
        console.error("Error fetching sales data:", err.response || err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [startDate, endDate]);

  const generateDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];

    while (start <= end) {
      dateArray.push(start.toISOString().split("T")[0]);
      start.setDate(start.getDate() + 1);
    }
    return dateArray;
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center">
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Sales Chart (Custom Date Range)
      </Typography>

      {/* Date Filter Inputs */}
      <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          sx={{ marginRight: 2 }}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </Box>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" stroke="#8884d8" />
          <YAxis stroke="#8884d8" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#ffa500"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SalesChart;
