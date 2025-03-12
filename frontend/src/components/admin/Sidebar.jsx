import React from 'react'
import { Link } from 'react-router-dom'

const Sidebar = () => {
 
    return (
        <div className="sidebar-wrapper">
            <nav id="sidebar">
                <ul className="list-unstyled components">
                    <li>
                        <Link to="/admin/dashboard"><i className="fa fa-tachometer"></i> Dashboard</Link>
                    </li>

                    <li>
                        <Link to="/admin/all-users"><i className="fa fa-user"></i> Users</Link>
                    </li>

                    <li>
                        <a href="#discountSubmenu" data-toggle="collapse" aria-expanded="false" className="dropdown-toggle d-flex align-items-center gap-2">
                            <i className="fa fa-tag"></i> Discounts <span> </span>
                        </a>

                        <ul className="collapse list-unstyled pt-2 pl-4" id="discountSubmenu">
                            <li>
                                <Link to="/admin/discounts"><i className="fa fa-clipboard"></i> All</Link>
                            </li>

                            <li>
                                <Link to="/admin/new-discount"><i className="fa fa-plus"></i>Create</Link>
                            </li>   
                        </ul>
                    </li>

                    <li>
                        <a href="#carsSubmenu" data-toggle="collapse" aria-expanded="false" className="dropdown-toggle d-flex align-items-center gap-2">
                            <i className="fa fa-car"></i> Cars <span> </span>
                        </a>

                        <ul className="collapse list-unstyled pt-2 pl-4" id="carsSubmenu">
                            <li>
                                <Link to="/admin/cars"><i className="fa fa-clipboard"></i> All</Link>
                            </li>
                            <li>
                                <Link to="/admin/create-car"><i className="fa fa-plus"></i> Create</Link>
                            </li>
                        </ul>
                    </li>

                    <li>
                        <Link to="/admin/rentals"><i className="fa fa-clipboard"></i>Rentals</Link>
                    </li>
                    <li>
                        <Link to="/admin/reviews"><i className="fa fa-star"></i>Reviews</Link>
                    </li>
                </ul>
            </nav>
        </div>
    )
}

export default Sidebar;
