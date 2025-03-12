import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Carousel, Button } from 'react-bootstrap';

const CarouselDialog = ({ images, show, handleClose }) => {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Image Carousel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Carousel>
          {images.map((image, index) => (
            <Carousel.Item key={index}>
              <img
                className="w-100"
                style={{maxHeight:"100%"}}
                src={image.url}
                alt={`Slide ${index}`}
              />
            </Carousel.Item>
          ))}
        </Carousel>
      </Modal.Body>
    </Modal>
  );
};

CarouselDialog.propTypes = {
  images: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
    })
  ),
  show: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
};

export default CarouselDialog;
