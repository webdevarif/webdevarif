// Create a new image element
const img = new Image();

// Array of image URLs
const images = [
  './banner-1.jpg',
  './banner-1.jpg',
  './banner-1.jpg',
];

// Generate a random index between 0 and the length of the images array
const randomIndex = Math.floor(Math.random() * images.length);

// Set the image source to the randomly selected URL
img.src = images[randomIndex];

// Append the image element to the document body
document.body.appendChild(img);
