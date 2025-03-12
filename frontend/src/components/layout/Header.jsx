import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, logout } from "../../utils/helper";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { HashLink } from "react-router-hash-link";

const Header = () => {
  const [user, setUser] = useState({});

  const navigate = useNavigate();

  const logoutHandler = () => {
    toast.success("Log out successfully"),
      {
        position: "bottom-right",
      };
    logout(navigate("/login"));
  };

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <>
      <nav id="headerNav" className="navbar row m-0 bg-warning mb-3">
        <div className="col-6 col-md-3 py-0 m-0">
          <div className="navbar-brand pl-5 d-flex align-items-center justify-content-center">
            <Link
              to="/"
              className="text-dark d-flex align-items-center gap-3"
              style={{ textDecoration: "none" }}
            >
              <img src="/images/logo.png" width="50"/>
              <span className="fs-3">BMW</span >
            </Link>
          </div>
        </div>

        <div className="d-none col-6 col-md-6 mt-md-0 text-center p-0 m-0 d-md-flex justify-content-center">
          <div className="d-flex justify-content-center align-items-center">
            <HashLink
              smooth
              to="/#get-start"
              className="btn center-btn ml-2"
              id="center_btn"
            >
              Get Started
            </HashLink>
            <HashLink
              to="/#about-us"
              className="btn center-btn ml-2"
              id="center_btn"
            >
              About Us
            </HashLink>
            <HashLink
              to="/#featured-car"
              className="btn center-btn ml-2"
              id="center_btn"
            >
              Cars
            </HashLink>
          </div>
        </div>
        <div className="col-6 col-md-3 mt-md-0 text-center p-0 m-0 d-flex justify-content-center">
          {user ? (
            <div className="ml-4 dropdown d-inline d-flex align-items-center">
              <img
                src={user.avatar?.url || "./src/assets/images/default-image.jpg"}
                alt={user && `${user.firstName} ${user.lastName}`}
                width={45}
                style={{ height: "45px" }}
                className="rounded-circle img-fluid"
              />
              <button
                className="btn btn-default dropdown-toggle mr-4 d-flex align-items-center"
                type="button"
                id="dropDownMenuButton"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <span>{user && `${user.firstName} ${user.lastName}`}</span>
              </button>
              <button className="btn btn-default">
                <Link
                  className="text-danger"
                  style={{ textDecoration: "none" }}
                  to="/"
                  onClick={logoutHandler}
                >
                  Logout
                </Link>
              </button>

              <div
                className="dropdown-menu"
                aria-labelledby="dropDownMenuButton"
              >
                {user && user.role === "admin" && (
                  <Link className="dropdown-item" to="/admin/">
                    Dashboard
                  </Link>
                )}
                {user && (
                  <Link className="dropdown-item" to="/favorite-cars">
                    Favorites
                  </Link>
                )}
                {user && (
                  <Link className="dropdown-item" to="/my-rentals">
                    My Rentals
                  </Link>
                )}
                {user && (
                  <Link className="dropdown-item" to="/my-cars">
                    My Cars
                  </Link>
                )}
                {user && (
                  <Link className="dropdown-item" to="/my-car-rental">
                    My Car Rental
                  </Link>
                )}
                {user && (
                    <Link className="dropdown-item" to="/my-profile">
                        My Profile
                    </Link>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Link to="/login" className="btn ml-4" id="login_btn">
                Login
              </Link>
              <Link to="/register" className="btn ml-4" id="register_btn">
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Header;
