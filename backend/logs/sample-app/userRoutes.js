// Sample E-commerce User Routes
// This file has an intentional bug on line 14

const users = [
  { id: 1, name: 'Priya', email: 'priya@example.com' },
  { id: 2, name: 'Rahul', email: 'rahul@example.com' },
];

function getUserById(id) {
  const user = users.find((u) => u.id === id);
  // BUG: user can be undefined if id not found
  // but we directly access .email without checking
  return user.email.toUpperCase(); // line 13 — crashes if user not found
}

function getAllUsers() {
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    // BUG: trying to access .address which doesn't exist
    city: u.address.city, // line 20 — crashes always
  }));
}

// Run both functions to trigger errors
try {
  console.log(getUserById(99)); // id 99 doesn't exist → crash
} catch (e) {
  console.error(e.stack);
}

try {
  console.log(getAllUsers());
} catch (e) {
  console.error(e.stack);
}
