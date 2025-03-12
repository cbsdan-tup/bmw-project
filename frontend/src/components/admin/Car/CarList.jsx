import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import Loader from "../../layout/Loader";
import Sidebar from "../Sidebar";
import { getToken } from "../../../utils/helper";
import "react-toastify/dist/ReactToastify.css";

const CarList = () => {
  const [cars, setCars] = useState([]);
  const [selectedCarIds, setSelectedCarIds] = useState([]);
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const getCar = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API}/Cars`);
      setCars(data);
      setLoading(false);
    } catch (error) {
      setError(error.response.data);
    }
  };

  const handleSelectionChange = (selectionModel) => {
    setSelectedCarIds(selectionModel);
  };

  const deleteCar = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        };
        await axios.delete(`${import.meta.env.VITE_API}/Cars/${id}`, config);
        setLoading(false);
        getCar();
        toast.success("Car deleted successfully", {
          position: "bottom-right",
        });
      } catch (error) {
        setError(error.response.data.message);
        setLoading(false);
      }
    }
  };

  // Delete multiple cars
  const deleteMultipleCars = async () => {
    if (selectedCarIds.length === 0) {
      toast.error("No cars selected for deletion");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone for multiple cars!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete them!",
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        
        const config = {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          };
          
        for (let id of selectedCarIds) {
          await axios.delete(`${import.meta.env.VITE_API}/Cars/${id}`, config);
        }
        setLoading(false);
        getCar();
        toast.success("Cars deleted successfully", {
          position: "bottom-right",
        });
      } catch (error) {
        setError(error.response.data.message);
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    getCar();

    if (error && error.message) {
      toast.error(error.message, {
        position: "bottom-right",
      });
    }

    if (error && error.status === "401") {
      navigate("/");
    }
  }, [error, navigate]);

  useEffect(() => {
    console.log("Current selected IDs:", selectedCarIds);
  }, [selectedCarIds]);

  const columns = [
    { field: "id", headerName: "ID", width: 250, headerClassName: "header-col1"},
    { field: "model", headerName: "Model", width: 200 },
    { field: "brand", headerName: "Brand", width: 200 },
    { field: "vehicleType", headerName: "Vehicle Type", width: 150 },
    {
      field: "isActive",
      headerName: "Status",
      width: 100,
    },
    {
      field: "action",
      headerName: "Actions",
      width: 250,
      renderCell: (params) => (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            gap: "10px",
            padding: "0",
            alignItems: "center",
          }}
        >
          <Link
            to={`/admin/update-car/${params.row.id}`}
            className="btn btn-primary py-1 px-2"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 0px",
              fontSize: "25px",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#789DBC",
              color: "white",
              textDecoration: "none",
              justifyContent: "center",
              whiteSpace: "nowrap", 
              minWidth: "60px", 
            }}
          >
            <i className="fa fa-pencil" style={{ marginRight: "5px" }}></i>
          </Link>

          <button
            className="btn btn-danger py-1 px-2"
            onClick={() => deleteCar(params.row.id)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 0px",
              fontSize: "25px",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#891652",
              color: "white",
              justifyContent: "center",
              whiteSpace: "nowrap", 
              minWidth: "60px", 
            }}
          >
            <i className="fa fa-trash" style={{ marginRight: "5px" }}></i>
          </button>
        </div>
      ),
    },
  ];

  const rows = cars.map((car) => ({
    id: car._id,
    model: car.model,
    brand: car.brand,
    vehicleType: car.vehicleType,
    isActive: car.isActive ? "Active" : "Not Active",
  }));
  return (
    <>
      <div>
        <Sidebar />
      </div>
      <div className="p-3 margin-left-300">
        <h1>Cars</h1>
        <hr />
        <div className="d-flex justify-content-start mb-3">
          <Link
            to="/admin/create-car"
            className="btn btn-success d-flex align-items-center"
            style={{ backgroundColor: "#6A9C89", marginRight: "20px" }}
          >
            <i className="fa fa-plus mr-2"></i>
            Create new Car
          </Link>
          <button
            className="btn btn-danger py-1 px-2"
            onClick={deleteMultipleCars}
            disabled={selectedCarIds.length === 0} 
            style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 0px",
              fontSize: "25px",
              border: "none",
              cursor: selectedCarIds.length > 0 ? "pointer" : "not-allowed", 
              backgroundColor: selectedCarIds.length > 0 ? "#891652" : "#ccc", 
              color: "white",
              justifyContent: "center",
              whiteSpace: "nowrap",
              maxHeight: "90px",
            }}
          >
            <i className="fa fa-trash" style={{ marginLeft: "0px" }}></i>
          </button>
        </div>
        <div className="row">
          {loading ? (
            <Loader />
          ) : (
            <Box sx={{ height: "auto", width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                pageSize={6}
                rowsPerPageOptions={[5]}
                checkboxSelection
                disableRowSelectionOnClick
                onRowSelectionModelChange={handleSelectionChange}
                sx={{
                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: "#C9E9D2",
                    fontWeight: "bold",
                  },
                  "& .MuiDataGrid-cell": {
                    backgroundColor: "#FEF9F2",
                    color: "#333",
                  },
                  "& .MuiCheckbox-root": {
                    color: "#891652",
                  },
                  "& .MuiToolbar-root p": {
                    margin: "0 !important"
                  },
                  "& .MuiDataGrid-columnHeaderTitleContainer": {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }

                }}
              />
            </Box>
          )}
        </div>
      </div>
    </>
  );
};

export default CarList;
