import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MDBDataTable } from 'mdbreact';
import Loader from '../../layout/Loader';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getToken } from '../../../utils/helper';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from '../Sidebar';
import UpdateUserPopup from './UpdateUserPopUp';
import UpdateUserPasswordPopup from './UpdateUserPasswordPopUp';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState({});
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false); //for updating user
    const [isPasswordPopupVisible, setPasswordPopupVisible] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState(null);
    const [refresh, setRefresh] = useState(false); 

    let navigate = useNavigate();

    const getUsers = async () => {
        try {            
            const config = {
                headers: {
                    Authorization: `Bearer ${getToken()}`
                }
            };
            const { data } = await axios.get(`${import.meta.env.VITE_API}/admin/all-users`, config);
            setUsers(data.users);
            setLoading(false);
        } catch (error) {
            setError(error.response.data);
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchUsers = async () => {
            await getUsers(); 
            if (error.message) {
                toast.error(error.message, { position: 'bottom-right' });
                if (error.status === '401') {
                    navigate('/');
                }
            }
        };

        fetchUsers();
    }, [refresh]);

    const openUpdateModal = (userId) => {
        setSelectedUserId(userId);
        setShowModal(true);
    };

    const closeUpdateModal = () => {
        setShowModal(false);
    };

    const openPasswordPopup = (userId) => {
        setSelectedUserId(userId);
        setPasswordPopupVisible(true);
    };
    
    const closePasswordPopup = () => {
        setPasswordPopupVisible(false);
    };

    const handleUserUpdate = () => {
        setRefresh((prev) => !prev); 
    };

    const userLists = () => {
        const data = {
            columns: [
                {
                    label: "Avatar",
                    field: "avatar",
                },
                {
                    label: "ID",
                    field: "id",
                    sort: "asc"
                },
                {
                    label: "Email",
                    field: "email",
                    sort: "asc"
                },
                {
                    label: "First Name",
                    field: "firstName",
                    sort: "asc"
                },
                {
                    label: "Last Name",
                    field: "lastName",
                    sort: "asc"
                },
                {
                    label: "Role",
                    field: "role",
                    sort: "asc"
                },
                {
                    label: "Actions",
                    field: "actions"
                }
            ],
            rows: []
        };

        if (users) {
            users.forEach(user => {
                data.rows.push({
                    avatar: (
                        <div className="d-flex align-items-center justify-content-center">
                            <img src={user.avatar.url} alt="profile" width="60" height="60"/>
                        </div>
                    ),
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role === 'admin' ? "Admin" : "User",
                    actions: (
                        <div>
                            <button className="btn btn-primary" onClick={() => openUpdateModal(user._id)}>
                                <i className='fa fa-edit'></i>
                            </button>
                            <button className="btn btn-warning ms-2" onClick={() => openPasswordPopup(user._id)}>
                                <i className='fa fa-key'></i>
                            </button>
                        </div>
                    )
                });
            });
        }

        return data;
    };

    return (
        <>  
            <div>
                <Sidebar/>
            </div>
            <div className='p-3 margin-left-300'>
                <h1>Users</h1>
                <hr/>
                <div className='row'>
                    {loading ? <Loader/> : (
                        <MDBDataTable 
                            data={userLists()}
                            bordered
                            striped
                            hover
                        />
                    )}
                </div>
            </div>
            <UpdateUserPopup
                id={selectedUserId}
                show={showModal}
                onHide={closeUpdateModal}
                onUserUpdate={handleUserUpdate}
            />

            <UpdateUserPasswordPopup 
                id={selectedUserId} 
                show={isPasswordPopupVisible} 
                onHide={closePasswordPopup} 
            />

        </>
    );
}

export default UserList;
