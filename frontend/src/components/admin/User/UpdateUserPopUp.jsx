import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getToken } from '../../../utils/helper';

const UpdateUserPopup = ({ id, show, onHide, onUserUpdate }) => { 
    const [user, setUser] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const config = {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`,
                        'Content-Type': 'application/json'
                    }
                };
                const response = await axios.get(`${import.meta.env.VITE_API}/admin/user/${id}`, config);
                setUser(response.data.user);
            } catch (error) {
                console.error("Error fetching user data", error);
                toast.error("Failed to fetch user data.", { position: 'bottom-right' }); 
            }
        };

        if (id) {
            fetchUserData();
        } else {
            setUser({
                firstName: '',
                lastName: '',
                email: '',
                role: '',
            });
        }
    }, [id]);

    const handleChange = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json',
                },
            };
            await axios.put(`${import.meta.env.VITE_API}/admin/update-user/${id}`, user, config);
            toast.success("User updated successfully!", { position: 'bottom-right' });
            onUserUpdate(); 
            onHide(); 
        } catch (error) {
            console.error("Error updating user", error);
            toast.error("Failed to update user.", { position: 'bottom-right' });
        }
    };

    if (!show) return null; 

    return (
        <div className="modal d-block" tabIndex="-1" style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Update User</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">First Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="firstName"
                                    value={user.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Last Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="lastName"
                                    value={user.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    value={user.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-select"
                                    name="role"
                                    value={user.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary">
                                Update User
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateUserPopup;
