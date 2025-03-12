import React, { useEffect, useState } from "react";
import { getToken } from "../../utils/helper";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, CircularProgress } from "@mui/material";
import axios from "axios";

const Top3CarsChart = () => {
  const [topCars, setTopCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopCars = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${getToken()}` },
        };

        const { data } = await axios.get(
          `${import.meta.env.VITE_API}/top3cars`,
          config
        );

        setTopCars(data.top3Cars);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch top cars data"
        );
        console.error("Error fetching top cars data:", err.response || err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCars();
  }, []);

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
        Top 3 Most Rented Cars
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topCars}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="carName" /> {/* Use the carName key */}
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#ffa500" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default Top3CarsChart;
