import React, { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MDBDataTable } from 'mdbreact'

import Loader from '../../layout/Loader'
import axios from 'axios'
import {toast} from 'react-toastify'

import { getToken } from '../../../utils/helper';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from '../Sidebar'
import Swal from 'sweetalert2'

const DiscountList = () => {
    const [discounts, setDiscounts] = useState([])
    const [error, setError] = useState({})

    const [loading, setLoading] = useState(true)

    let navigate = useNavigate()

    const getDiscounts = async () => {
        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                }
            }
            
            const {data} = await axios.get(`${import.meta.env.VITE_API}/discounts`, config)
            setDiscounts(data.discounts)
            setLoading(false)
        } catch(error) {
            setError(error.response.data)
        }
    }

    const deleteDiscount = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        })

        if (result.isConfirmed) {
            setLoading(true)
            try {
                const config = {
                    headers: {
                        'Authorization': `Bearer ${getToken()}`
                    }
                }
                await axios.delete(`${import.meta.env.VITE_API}/discount/${id}`, config)
                setLoading(false)
                getDiscounts()
                toast.success('Discount deleted successfully', {
                    position: 'bottom-right'
                })
            } catch (error) {
                setError(error.response.data.message)
                setLoading(false)
            }
        }
    }

    useEffect(()=>{
        getDiscounts()
        
        if (error) {
            toast.error(error.message, {
                position: 'bottom-right'
            })
        }
        if (error.status == '401') {
            toast.error(error.message, {
                position: 'bottom-right'
            })
            navigate('/')
        }
    }, [])

    const discountLists = () => {
        const data = {
            columns: [
                {
                    label: "ID",
                    field: "id",
                    sort: "asc"
                },
                {
                    label: "Code",
                    field: "code",
                    sort: "asc"
                },
                {
                    label: "Discount Percentage",
                    field: "discountPercentage",
                    sort: "asc"
                },
                {
                    label: "Usage",
                    field: "isOneTime"
                },
                {
                    label: "Actions",
                    field: "actions"
                }
            ],
            rows: []
        }

        if (discounts)
        discounts.forEach(discount => {
            data.rows.push({
                id: discount._id,
                code: discount.code,
                discountPercentage: discount.discountPercentage,
                isOneTime: discount.isOneTime ? "One Time Use" : "Multiple Use",
                actions: <>
                    <Link to={`/admin/update-discount/${discount._id}`} className="btn btn-primary py-1 px-2">
                        <i className="fa fa-pencil"></i>
                    </Link>
                    <button className="btn btn-danger py-1 px-2 ml-2" onClick={() => {deleteDiscount(discount._id)}}>
                        <i className="fa fa-trash"></i>
                    </button>
                </>
            })
        })

        return data;
    }

    return (
        <>  
            <div>
                <Sidebar/>
            </div>
            <div className='p-3 margin-left-300'>
                <h1>Discounts</h1>
                <hr/>
                <div className="d-flex justify-content-start mb-3">
                    <Link to="/admin/new-discount" className="btn btn-success d-flex align-items-center">
                        <i className="fa fa-plus mr-2"></i>
                        Create new Discount
                    </Link>
                </div>
                <div className='row'>
                    {loading ? <Loader/> : (
                        <MDBDataTable 
                            data={discountLists()}
                            bordered
                            striped
                            hover
                        />
                    )}

                </div>
            </div>
        </>
    )
}

export default DiscountList;