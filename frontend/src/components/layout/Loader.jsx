import React from 'react';

const Loader = () => {
    return (
        <div 
            className="loader" 
            style={{
                minHeight: "80vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <h1 className="loading-text">Loading...</h1>
        </div>
    );
}

export default Loader;
