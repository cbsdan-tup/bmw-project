import React, { useState, useEffect } from 'react';
import { getToken } from '../../utils/helper';
import axios from "axios";
import Loader from '../layout/Loader';
import { PieChart, Pie, Legend, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, Typography, Box } from '@mui/material';

export default function CarAvailabilityChart() {
    const [carAvailability, setCarAvailability] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const pieColors = ["#FF6633", "#FFB399", "#FF33FF"];

    const fetchCarAvailability = async () => {
        try {
            const config = {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            };
            const { data } = await axios.get(`${import.meta.env.VITE_API}/car-availability`, config);
            setCarAvailability(data.availability);
            setLoading(false);
        } catch (error) {
            setError(error.response?.data?.message || 'Error fetching data');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCarAvailability();
    }, []);

    if (loading) return <Loader />;
    if (error) return <Typography color="error">{error}</Typography>;

    // If there's no data
    if (carAvailability.length === 0) {
        return (
            <Card sx={{ maxWidth: 600, margin: 'auto', mt: 4 }}>
                <CardContent>
                    <Typography variant="h6" color="textSecondary" align="center">
                        No car availability data available. Please check back later.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ 
            maxWidth: 800, 
            height: 550,
            margin: "auto", 
            mt: 4, 
            borderRadius: 4,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', 
            background: 'linear-gradient(135deg, #f3e5f5 30%, #e3f2fd 100%)'
             }}>
            <CardContent>
                <Typography variant="h5" component="h2" align="center" gutterBottom sx={{
                    fontWeight: 600,
                    color: '#424242',
                    pb: 2,
                }}>
                    Car Availability
                </Typography>
                <Box sx={{ height: 500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                dataKey="count"
                                nameKey="category"
                                data={carAvailability}
                                cx="50%"
                                cy="50%"
                                outerRadius={200}
                                fill="#8884d8"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {carAvailability.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend layout="vertical" verticalAlign="top" align="right" />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
            </CardContent>
        </Card>
    );
}
