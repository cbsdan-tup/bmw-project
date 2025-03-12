import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getToken } from '../../../utils/helper';

const UpdateUserPasswordPopUp = ({ id, show, onHide }) => {
    const [newPassword, setNewPassword] = useState('');

    const handleChange = (e) => {
        setNewPassword(e.target.value);
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

            const response = await axios.put(`${import.meta.env.VITE_API}/admin/update-password/${id}`, { newPassword }, config);

            if (response.data.success) {
                toast.success("Password updated successfully!", { position: 'bottom-right' });
                onHide(); 
            }
        } catch (error) {
            console.error("Error updating password", error);
            toast.error("Failed to update password.", { position: 'bottom-right' });
        }
    };

    if (!show) return null;

    return (
        <div className="modal d-block" tabIndex="-1" style={{ display: show ? 'block' : 'none' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Update Password</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="newPassword"
                                    value={newPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary">
                                Update Password
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateUserPasswordPopUp;
