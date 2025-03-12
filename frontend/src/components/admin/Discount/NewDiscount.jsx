import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import Sidebar from '../Sidebar';
import {getToken} from '../../../utils/helper'

const NewDiscount = () => {
    const [data, setData] = useState({
        code: "",
        discountPercentage: "",
        isOneTime: false, 
        description: "",
        startDate: "",
        endDate: ""
    });

    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    let navigate = useNavigate();

    const handleChange = e => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setData(prevState => ({ ...prevState, [name]: checked }));
        } else {
            setData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleLogoChange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setLogoPreview(reader.result);
                setLogo(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setIsSubmitting(true)
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        if (logo) {
            formData.append("logo", logo);
        }

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${getToken()}` 
                }
            };

            const {data: response} = await axios.post(`${import.meta.env.VITE_API}/create-discount`, formData, config);
            if (response && response.success) {
                toast.success('Discount created successfully!', {
                    position: 'bottom-right'
                });
                navigate('/admin/discounts'); 
            } else {
                console.log(response);
                toast.error(response, {
                    position: 'bottom-right'
                });
            }
            setIsSubmitting(false)
        } catch(error) {
            const res = error.response?.data;
            console.log(error);
            if (res?.message) {
                toast.error(res.message, {
                    position: "bottom-right"
                });
            }
            if (Array.isArray(res?.errors)) {
                res.errors.forEach(error => {
                    toast.error(error, {
                        position: "bottom-right"
                    });
                });
            }
            if(error?.message) {
                toast.error(error.message, {
                    position: "bottom-right"
                });
            }
            setIsSubmitting(false)
        }

    };

    return (
        <>
            <div>
                <Sidebar />
            </div>
            <div className="container p-3" style={{marginLeft:"300px"}}>
                <div className='d-flex align-items-center justify-content-between'>
                    <h2>Create New Discount</h2>
                    <Link to="/admin/discounts" className="btn btn-secondary mt-3 ml-2">Back to List</Link>
                </div>
                <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                    <div className="form-group">
                        <label htmlFor="code">Discount Code</label>
                        <input
                            type="text"
                            className="form-control"
                            id="code"
                            name="code"
                            value={data.code}
                            onChange={handleChange}
                            required
                        />
                        <div className="invalid-feedback">
                            Please provide a discount code.
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="discountPercentage">Discount Percentage</label>
                        <input
                            type="number"
                            className="form-control"
                            id="discountPercentage"
                            name="discountPercentage"
                            value={data.discountPercentage}
                            onChange={handleChange}
                            required
                        />
                        <div className="invalid-feedback">
                            Please provide a valid discount percentage.
                        </div>
                    </div>
                    <div className="form-group form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            id="isOneTime"
                            name="isOneTime"
                            checked={data.isOneTime}
                            onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="isOneTime">Is One Time Use?</label>
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            className="form-control"
                            id="description"
                            name="description"
                            value={data.description}
                            onChange={handleChange}
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="startDate">Start Date</label>
                        <input
                            type="date"
                            className="form-control"
                            id="startDate"
                            name="startDate"
                            value={data.startDate}
                            onChange={handleChange}
                            required
                        />
                        <div className="invalid-feedback">
                            Please provide a start date.
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="endDate">End Date</label>
                        <input
                            type="date"
                            className="form-control"
                            id="endDate"
                            name="endDate"
                            value={data.endDate}
                            onChange={handleChange}
                            required
                        />
                        <div className="invalid-feedback">
                            Please provide an end date.
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="logo">Upload Logo</label>
                        <input
                            type="file"
                            className="form-control-file"
                            id="logo"
                            accept="image/jpeg, image/jpg, image/png"
                            onChange={handleLogoChange}
                        />
                        {logoPreview && <img src={logoPreview} alt="Logo Preview" className="img-thumbnail mt-2" style={{ width: '100px', height: 'auto' }} />}
                    </div>
                    <button type="submit" className="btn btn-primary mt-3" disabled={isSubmitting}>{!isSubmitting ? "Create Discount" : "Submitting" }</button>
                    <Link to="/admin/discounts" className="btn btn-secondary mt-3 ml-2">Cancel</Link>
                </form>
            </div>
        </>
    );
};

export default NewDiscount;
