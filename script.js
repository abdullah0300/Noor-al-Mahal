// Supabase Configuration
const SUPABASE_URL = 'https://ixzgedpzhbzfomttiadg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4emdlZHB6aGJ6Zm9tdHRpYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Nzg5MjIsImV4cCI6MjA2NzQ1NDkyMn0.laobv0954I3xlGijKj8dl8UILh5V3hqSoYDo1NiVlpw';

// Initialize global variables
let supabase;
let cars = [];
let customers = [];
let purchases = [];
let currentUser = null;
let userRole = null;
let currentCustomer = null;

function initSupabase() {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error('Supabase client is not loaded. Please check the CDN URL or network connection.');
        showNotification('Failed to initialize database connection!', 'error');
    }
}

// Initialize the application after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing application...'); // Debug log
    initSupabase();
    checkAuthStatus();
    setupEventListeners();
});

// Check authentication status and redirect only if necessary
async function checkAuthStatus() {
    console.log('Checking auth status...'); // Debug log
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (savedUser && savedRole) {
        try {
            currentUser = JSON.parse(savedUser);
            userRole = savedRole;
            console.log(`User found: ${currentUser.username || currentUser.name}, Role: ${userRole}`); // Debug log
            await loadData();

            // Redirect only if on index.html or login pages
            if (currentPage === 'index.html' || currentPage === '' || currentPage === 'login.html') {
                console.log('On login page, redirecting based on role'); // Debug log
                if (userRole === 'admin') {
                    console.log('Redirecting to admin.html'); // Debug log
                    window.location.href = 'admin.html';
                } else if (userRole === 'customer') {
                    console.log('Redirecting to customer.html'); // Debug log
                    window.location.href = 'customer.html';
                }
            } else {
                // If on admin.html or customer.html, show the appropriate panel
                showAuthenticatedPanel();
            }
        } catch (error) {
            console.error('Error in checkAuthStatus:', error); // Debug log
            showNotification('Error checking authentication status!', 'error');
            showLoginPanel();
        }
    } else {
        console.log('No user found, showing login panel'); // Debug log
        // Allow access to login-related pages without redirect
        const allowedPages = ['index.html', 'login.html', 'register.html', ''];
        if (!allowedPages.includes(currentPage)) {
            console.log('Redirecting to index.html'); // Debug log
            window.location.href = 'index.html';
        } else {
            showLoginPanel();
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...'); // Debug log
    // Only attach listeners if the elements exist on the current page
    const adminLoginForm = document.getElementById('admin-login-form');
    const customerLoginForm = document.getElementById('customer-login-form');
    const addCarForm = document.getElementById('add-car-form');
    const allocateForm = document.getElementById('allocate-form');
    const editCarForm = document.getElementById('edit-car-form');
    const addCustomerForm = document.getElementById('add-customer-form');

    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
    if (customerLoginForm) customerLoginForm.addEventListener('submit', handleCustomerLogin);
    if (addCarForm) addCarForm.addEventListener('submit', handleAddCar);
    if (allocateForm) allocateForm.addEventListener('submit', handleAllocateCar);
    if (editCarForm) editCarForm.addEventListener('submit', handleEditCar);
    if (addCustomerForm) addCustomerForm.addEventListener('submit', handleAddCustomer);
}

// Load all data from Supabase
async function loadData() {
    try {
        const [carsData, customersData, purchasesData] = await Promise.all([
            supabase.from('cars').select('*'),
            supabase.from('customers').select('*'),
            supabase.from('purchases').select('*')
        ]);
        cars = carsData.data || [];
        customers = customersData.data || [];
        purchases = purchasesData.data || [];
        console.log('Data loaded successfully:', { cars, customers, purchases }); // Debug log
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Failed to load data from database!', 'error');
    }
}

// Show login panel
function showLoginPanel() {
    console.log('Showing login panel'); // Debug log
    const loginPanel = document.getElementById('login-panel');
    if (loginPanel) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        loginPanel.classList.add('active');
    }
}

// Show authenticated panel based on role
function showAuthenticatedPanel() {
    console.log('Showing authenticated panel for role:', userRole); // Debug log
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (userRole === 'admin' && currentPage === 'admin.html') {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            adminPanel.classList.add('active');
            document.getElementById('admin-welcome').textContent = `Welcome, ${currentUser.username}!`;
            loadCustomers();
            loadCars();
        }
    } else if (userRole === 'customer' && currentPage === 'customer.html') {
        const customerPanel = document.getElementById('customer-panel');
        if (customerPanel) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            customerPanel.classList.add('active');
            document.getElementById('customer-welcome').textContent = `Welcome, ${currentUser.name}!`;
            document.getElementById('customer-name').textContent = currentUser.name;
            document.getElementById('customer-email').textContent = currentUser.email;
            currentCustomer = currentUser;
            loadCustomerCars();
            loadPurchaseHistory();
            loadAvailableCars();
        }
    }
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    console.log('Handling admin login'); // Debug log
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    try {
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username)
            .eq('password_hash', password)
            .single();
        if (error || !data) {
            showNotification('Invalid admin credentials!', 'error');
            return;
        }
        currentUser = { username: username };
        userRole = 'admin';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('userRole', userRole);
        await loadData();
        showNotification('Admin login successful!', 'success');
        console.log('Redirecting to admin.html after successful login'); // Debug log
        window.location.href = 'admin.html';
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification('Error during login!', 'error');
    }
}

// Handle customer login
async function handleCustomerLogin(e) {
    e.preventDefault();
    console.log('Handling customer login'); // Debug log
    const email = document.getElementById('customer-login-email').value;
    const password = document.getElementById('customer-login-password').value;
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('email', email)
            .eq('password_hash', password)
            .single();
        if (error || !data) {
            showNotification('Invalid customer credentials!', 'error');
            return;
        }
        currentUser = data;
        userRole = 'customer';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('userRole', userRole);
        await loadData();
        showNotification('Customer login successful!', 'success');
        console.log('Redirecting to customer.html after successful login'); // Debug log
        window.location.href = 'customer.html';
    } catch (error) {
        console.error('Customer login error:', error);
        showNotification('Error during login!', 'error');
    }
}

// Logout function
function logout() {
    console.log('Logging out'); // Debug log
    currentUser = null;
    userRole = null;
    currentCustomer = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    showNotification('Logged out successfully!', 'success');
    window.location.href = 'index.html';
}

// Login form switching
function showLoginForm(type) {
    console.log(`Switching to ${type} login form`); // Debug log
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(type + '-login').classList.add('active');
}

// Tab Management
function showTab(tabName) {
    console.log(`Showing tab: ${tabName}`); // Debug log
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Convert file to Base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Handle adding a car with Base64 images
async function handleAddCar(e) {
    e.preventDefault();
    console.log('Handling add car'); // Debug log
   const carData = {
    make: document.getElementById('make').value,
    model: document.getElementById('model').value,
    year: parseInt(document.getElementById('year').value),
    price: parseFloat(document.getElementById('price').value),
    mileage: parseInt(document.getElementById('mileage').value),
    fuel_type: document.getElementById('fuel_type').value,
    color: document.getElementById('color').value,
    transmission: document.getElementById('transmission').value,
    engine_cc: parseInt(document.getElementById('engine_cc').value),
    doors: parseInt(document.getElementById('doors').value),
    seats: parseInt(document.getElementById('seats').value),
    registration_year: parseInt(document.getElementById('registration_year').value),
    vin: document.getElementById('vin').value,
    additional_details: document.getElementById('additional_details').value || '',
    status: 'available',
    images: []
};

    // Check for duplicate VIN
    try {
        const { data: existingCars, error: checkError } = await supabase
            .from('cars')
            .select('id')
            .eq('vin', carData.vin);
        if (checkError) {
            console.error('Error checking VIN:', checkError);
            showNotification('Error checking VIN uniqueness!', 'error');
            return;
        }
        if (existingCars && existingCars.length > 0) {
            showNotification('This VIN is already registered. Please use a unique VIN.', 'error');
            document.getElementById('vin').focus();
            return;
        }
    } catch (error) {
        console.error('Unexpected error checking VIN:', error);
        showNotification('Unexpected error checking VIN!', 'error');
        return;
    }

    const files = document.getElementById('car-images').files;
    if (files.length === 0) {
        showNotification('Please select at least one image!', 'error');
        return;
    }
    for (const file of files) {
        if (!file.type.match(/image\/(png|jpeg)/)) {
            showNotification(`File ${file.name} must be PNG or JPEG!`, 'error');
            continue;
        }
        if (file.size > 1 * 1024 * 1024) { // Limit to 1MB
            showNotification(`File ${file.name} is too large! Max size is 1MB.`, 'error');
            continue;
        }
        try {
            showNotification(`Processing ${file.name}...`, 'info');
            const base64String = await fileToBase64(file);
            carData.images.push(base64String);
        } catch (error) {
            console.error('Error converting file to Base64:', file.name, error);
            showNotification(`Failed to process ${file.name}`, 'error');
            return;
        }
    }
    if (carData.images.length === 0) {
        showNotification('No valid images processed. Cannot add car.', 'error');
        return;
    }
    try {
        const { data, error } = await supabase
            .from('cars')
            .insert([carData])
            .select()
            .single();
        if (error) {
            console.error('Insert error:', error);
            throw error;
        }
        cars = (await supabase.from('cars').select('*')).data;
        showNotification('Car added successfully!', 'success');
        e.target.reset();
        loadCars();
    } catch (error) {
        console.error('Error adding car:', error);
        showNotification(`Failed to add car: ${error.message}`, 'error');
    }
}

// Handle allocating a car to a customer
async function handleAllocateCar(e) {
    e.preventDefault();
    console.log('Handling allocate car'); // Debug log
    const carId = document.getElementById('allocate-car-id').value;
    const customerId = document.getElementById('allocate-customer-id').value;
    const car = cars.find(c => c.id === parseInt(carId));
    const customer = customers.find(c => c.id === parseInt(customerId));
    if (!car || !customer) {
        showNotification('Invalid car or customer selection!', 'error');
        return;
    }
    if (confirm(`Allocate ${car.make} ${car.model} to ${customer.name} for $${car.price.toLocaleString()}?`)) {
        try {
            const shippingData = {
                from_port: document.getElementById('shipping-from-port').value || null,
                departure_date: document.getElementById('shipping-departure-date').value || null,
                arrival_port: document.getElementById('shipping-arrival-port').value || null,
                arrival_date: document.getElementById('shipping-arrival-date').value || null,
                consignee: customer.name,
                consignee_address: customer.address,
                consignee_tel: customer.phone,
                notify_address: document.getElementById('shipping-notify-address').value || 'Same as Consignee'
            };
            console.log('Shipping Data:', shippingData);
console.log('Customer Phone:', customer.phone);
            if (!shippingData.departure_date || !shippingData.arrival_date) {
                showNotification('Departure Date and Arrival Date are required!', 'error');
                return;
            }
            const purchaseData = {
                customer_id: parseInt(customerId),
                car_id: parseInt(carId),
                purchase_date: new Date().toISOString().split('T')[0],
                purchase_price: car.price,
                status: 'completed',
                shipping_info: shippingData
            };
            const { data: purchaseInsert, error: purchaseError } = await supabase
                .from('purchases')
                .insert([purchaseData])
                .select();
            if (purchaseError) {
                console.error('Purchase insert error:', purchaseError);
                throw purchaseError;
            }
            const { error: carUpdateError } = await supabase
                .from('cars')
                .update({ status: 'sold' })
                .eq('id', carId);
            if (carUpdateError) {
                console.error('Car update error:', carUpdateError);
                throw carUpdateError;
            }
            cars = (await supabase.from('cars').select('*')).data;
            purchases = (await supabase.from('purchases').select('*')).data;
            showNotification('Car allocated successfully!', 'success');
            closeAllocateModal();
            loadCars();
            if (userRole === 'customer' && currentCustomer.id === parseInt(customerId)) {
                loadCustomerCars();
            }
        } catch (error) {
            console.error('Error allocating car:', error);
            showNotification(`Failed to allocate car: ${error.message}`, 'error');
        }
    }
}

// Handle editing a car with Base64 images
async function handleEditCar(e) {
    e.preventDefault();
    console.log('Handling edit car'); // Debug log
    const carId = e.target.dataset.carId;
    const existingCar = cars.find(c => c.id === parseInt(carId));
    const carData = {
        make: document.getElementById('edit-make').value,
        model: document.getElementById('edit-model').value,
        year: parseInt(document.getElementById('edit-year').value),
        price: parseFloat(document.getElementById('edit-price').value),
        mileage: parseInt(document.getElementById('edit-mileage').value),
        fuel_type: document.getElementById('edit-fuel_type').value,
        color: document.getElementById('edit-color').value,
        transmission: document.getElementById('edit-transmission').value,
        engine_cc: parseInt(document.getElementById('edit-engine_cc').value),
        doors: parseInt(document.getElementById('edit-doors').value),
        seats: parseInt(document.getElementById('edit-seats').value),
        registration_year: parseInt(document.getElementById('edit-registration_year').value),
        vin: document.getElementById('edit-vin').value,
            additional_details: document.getElementById('edit-additional_details').value || '', // ADD THIS LINE
        images: existingCar.images || []
    };

    // Check for duplicate VIN (exclude current car)
    try {
        const { data: existingCarsWithVIN, error: checkError } = await supabase
            .from('cars')
            .select('id')
            .eq('vin', carData.vin)
            .neq('id', carId);
        if (checkError) {
            console.error('Error checking VIN:', checkError);
            showNotification('Error checking VIN uniqueness!', 'error');
            return;
        }
        if (existingCarsWithVIN && existingCarsWithVIN.length > 0) {
            showNotification('This VIN is already registered to another car. Please use a unique VIN.', 'error');
            document.getElementById('edit-vin').focus();
            return;
        }
    } catch (error) {
        console.error('Unexpected error checking VIN:', error);
        showNotification('Unexpected error checking VIN!', 'error');
        return;
    }

    const files = document.getElementById('edit-car-images').files;
    if (files.length > 0) {
        for (const file of files) {
            if (!file.type.match(/image\/(png|jpeg)/)) {
                showNotification(`File ${file.name} must be PNG or JPEG!`, 'error');
                continue;
            }
            if (file.size > 1 * 1024 * 1024) { // Limit to 1MB
                showNotification(`File ${file.name} is too large! Max size is 1MB.`, 'error');
                continue;
            }
            try {
                showNotification(`Processing ${file.name}...`, 'info');
                const base64String = await fileToBase64(file);
                carData.images.push(base64String);
            } catch (error) {
                console.error('Error converting file to Base64:', file.name, error);
                showNotification(`Failed to process ${file.name}`, 'error');
                return;
            }
        }
    }
    try {
        const { error } = await supabase
            .from('cars')
            .update(carData)
            .eq('id', carId);
        if (error) {
            console.error('Update error:', error);
            throw error;
        }
        cars = (await supabase.from('cars').select('*')).data;
        showNotification('Car updated successfully!', 'success');
        closeEditModal();
        loadCars();
    } catch (error) {
        console.error('Error updating car:', error);
        showNotification(`Failed to update car: ${error.message}`, 'error');
    }
}

// Load cars for admin
async function loadCars() {
    if (userRole === 'admin') {
        const { data, error } = await supabase.from('cars').select('*');
        if (error) {
            console.error('Load cars error:', error);
            showNotification('Failed to load cars!', 'error');
            return;
        }
        cars = data;
        const adminGrid = document.getElementById('admin-cars-grid');
        if (adminGrid) {
            adminGrid.innerHTML = '';
            cars.forEach(car => {
                const carCard = createCarCard(car, true, true);
                adminGrid.appendChild(carCard);
            });
        }
    }
}

// Create car card with Base64 images
function createCarCard(car, isAdmin, showEdit = false) {
    console.log(`Creating car card for ${car.make} ${car.model}`);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100';
    
    const placeholderImage = 'https://placehold.co/300x200/dc2626/white?text=No+Image';
    const mainImage = car.images && car.images.length > 0 ? car.images[0] : placeholderImage;
    
    const statusColors = {
        'available': 'bg-green-100 text-green-800 border-green-200',
        'sold': 'bg-red-100 text-red-800 border-red-200',
        'reserved': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    
    card.innerHTML = `
        <div class="relative">
            <img src="${mainImage}" alt="${car.make} ${car.model}" class="w-full h-48 object-cover">
            <div class="absolute top-3 right-3">
                <span class="px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[car.status] || statusColors.available}">
                    ${car.status.toUpperCase()}
                </span>
            </div>
        </div>
        
        <div class="p-6">
            <div class="mb-4">
                <h3 class="text-xl font-bold text-gray-900 mb-1">${car.make} ${car.model}</h3>
                <p class="text-gray-600">${car.year}</p>
                <div class="text-2xl font-bold text-red-600 mt-2"> JP¥ ${car.price.toLocaleString()}</div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm mb-4">
                <div class="flex items-center text-gray-600">
                    <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    <span>${car.mileage.toLocaleString()} km</span>
                </div>
                <div class="flex items-center text-gray-600">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span>${car.fuel_type}</span>
                </div>
                <div class="flex items-center text-gray-600">
                    <span class="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                    <span>${car.color}</span>
                </div>
                <div class="flex items-center text-gray-600">
                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                    <span>${car.transmission}</span>
                </div>
            </div>
            
            ${car.images && car.images.length > 1 ? `
                <div class="flex gap-2 mb-4 overflow-x-auto">
                    ${car.images.slice(0, 4).map(img => `
                        <img src="${img || placeholderImage}" alt="Car image" class="w-12 h-8 object-cover rounded border-2 border-transparent hover:border-red-500 cursor-pointer flex-shrink-0">
                    `).join('')}
                    ${car.images.length > 4 ? `<div class="w-12 h-8 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">+${car.images.length - 4}</div>` : ''}
                </div>
            ` : ''}

            
            
            ${isAdmin ? `
                <div class="flex flex-wrap gap-2">
                    <button onclick="showCarDetails(${car.id})" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                        Details
                    </button>
                    ${car.status === 'available' ? `
                        <button onclick="showAllocateModal(${car.id})" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Allocate
                        </button>
                    ` : ''}
                    ${showEdit ? `
                        <button onclick="showEditModal(${car.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                            Edit
                        </button>
                    ` : ''}
                    <button onclick="deleteCar(${car.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                        Delete
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    return card;
}

// Show car details with Base64 images
function showCarDetails(carId) {
    console.log(`Showing details for car ID: ${carId}`);
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    const modal = document.getElementById('car-details-modal');
    const content = document.getElementById('car-details-content');
    const placeholderImage = 'https://placehold.co/400x300/dc2626/white?text=No+Image';
    let activeImage = car.images && car.images.length > 0 ? car.images[0] : placeholderImage;
    
    const statusColors = {
        'available': 'bg-green-100 text-green-800',
        'sold': 'bg-red-100 text-red-800',
        'reserved': 'bg-yellow-100 text-yellow-800'
    };
    
    content.innerHTML = `
        <div class="max-w-4xl">
            <div class="mb-6">
                <h3 class="text-3xl font-bold text-gray-900 mb-2">${car.make} ${car.model}</h3>
                <div class="flex items-center gap-4">
                    <span class="text-lg text-gray-600">${car.year}</span>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusColors[car.status] || statusColors.available}">
                        ${car.status.toUpperCase()}
                    </span>
                </div>
                <div class="text-3xl font-bold text-red-600 mt-2"> JP¥ ${car.price.toLocaleString()}</div>
            </div>
            
            <div class="mb-6">
                <img src="${activeImage}" alt="${car.make} ${car.model}" class="w-full h-64 object-cover rounded-lg shadow-lg mb-4">
                ${car.images && car.images.length > 1 ? `
                    <div class="flex gap-2 overflow-x-auto pb-2">
                        ${car.images.map((img, index) => `
                            <img src="${img || placeholderImage}" 
                                 alt="${car.make} ${car.model}" 
                                 class="w-20 h-16 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-red-500 transition-colors ${index === 0 ? 'border-red-500' : ''}" 
                                 onclick="document.querySelector('#car-details-content .w-full.h-64').src='${img || placeholderImage}'; document.querySelectorAll('#car-details-content .w-20.h-16').forEach(el => el.classList.remove('border-red-500')); this.classList.add('border-red-500');">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-gray-600">Mileage:</span><span class="font-medium">${car.mileage.toLocaleString()} km</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Fuel Type:</span><span class="font-medium">${car.fuel_type}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Color:</span><span class="font-medium">${car.color}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Transmission:</span><span class="font-medium">${car.transmission}</span></div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-3">Technical Details</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span class="text-gray-600">Engine CC:</span><span class="font-medium">${car.engine_cc}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Doors:</span><span class="font-medium">${car.doors}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Seats:</span><span class="font-medium">${car.seats}</span></div>
                        <div class="flex justify-between"><span class="text-gray-600">Registration Year:</span><span class="font-medium">${car.registration_year}</span></div>
                    </div>
                </div>
            </div>
            
            <div class="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Vehicle Identification</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between"><span class="text-gray-600">VIN:</span><span class="font-mono font-medium">${car.vin}</span></div>
                    <div class="flex justify-between"><span class="text-gray-600">Record ID:</span><span class="font-medium">#${car.id}</span></div>
                </div>
            </div>
            
            ${purchases.find(p => p.car_id === car.id) ? `
                <div class="bg-green-50 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-900 mb-3">Shipping Information</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <div class="flex justify-between"><span class="text-gray-600">From Port:</span><span class="font-medium">${purchases.find(p => p.car_id === car.id).shipping_info.from_port || 'N/A'}</span></div>
                            <div class="flex justify-between"><span class="text-gray-600">Departure:</span><span class="font-medium">${new Date(purchases.find(p => p.car_id === car.id).shipping_info.departure_date).toLocaleDateString() || 'N/A'}</span></div>
                            <div class="flex justify-between"><span class="text-gray-600">Arrival Port:</span><span class="font-medium">${purchases.find(p => p.car_id === car.id).shipping_info.arrival_port || 'N/A'}</span></div>
                        </div>
                        <div class="space-y-2">
                            <div class="flex justify-between"><span class="text-gray-600">Arrival:</span><span class="font-medium">${new Date(purchases.find(p => p.car_id === car.id).shipping_info.arrival_date).toLocaleDateString() || 'N/A'}</span></div>
                            <div class="flex justify-between"><span class="text-gray-600">Consignee:</span><span class="font-medium">${purchases.find(p => p.car_id === car.id).shipping_info.consignee || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
            ` : ''}
            ${car.additional_details ? `
    <div class="bg-yellow-50 rounded-lg p-4 mb-6">
        <h4 class="text-lg font-semibold text-gray-900 mb-3">Additional Details</h4>
        <p class="text-sm text-gray-700 whitespace-pre-wrap">${car.additional_details}</p>
    </div>
` : ''}
        </div>
    `;
    if (modal) modal.style.display = 'block';
}

// Show customer car details with purchase and shipping info
// Redirect to car details page instead of showing modal
// Redirect to car details page using URL parameters
function showCustomerCarDetails(carId, purchaseId) {
    console.log(`Redirecting to car details page for car ID: ${carId}, purchase ID: ${purchaseId}`);
    
    // Simply pass the IDs via URL - the details page will fetch the data
    window.location.href = `car-details.html?carId=${carId}&purchaseId=${purchaseId}`;
}



// Switch main image in car details modal
function switchMainImage(imageSrc, thumbnailElement) {
    document.getElementById('main-car-image').src = imageSrc;
    
    // Update thumbnail borders
    document.querySelectorAll('#car-details-content .grid img').forEach(img => {
        img.classList.remove('border-primary');
        img.classList.add('border-gray-200');
    });
    thumbnailElement.classList.remove('border-gray-200');
    thumbnailElement.classList.add('border-primary');
}

// Download car image
function downloadCarImage() {
    const mainImage = document.getElementById('main-image');
    const carTitle = document.getElementById('car-title').textContent;
    
    if (mainImage.src.startsWith('data:')) {
        // For base64 images (from your database)
        const link = document.createElement('a');
        link.href = mainImage.src;
        link.download = `${carTitle.replace(/\s+/g, '_')}_image.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (mainImage.src.includes('placehold.co')) {
        // For placeholder images
        alert('No image available to download');
    } else {
        // For URL-based images
        fetch(mainImage.src)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${carTitle.replace(/\s+/g, '_')}_image.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            })
            .catch(error => {
                console.error('Error downloading image:', error);
                alert('Failed to download image');
            });
    }
}

function printPage() {
    // Hide all navigation and action buttons before printing
    const noPrintElements = document.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');
    
    // Print the page
    window.print();
    
    // Show the elements again after printing
    setTimeout(() => {
        noPrintElements.forEach(el => el.style.display = '');
    }, 1000);
}

// Close car details modal
function closeCarDetailsModal() {
    const modal = document.getElementById('car-details-modal');
    if (modal) modal.style.display = 'none';
}

// Delete a car
async function deleteCar(carId) {
    console.log(`Deleting car ID: ${carId}`); // Debug log
    if (confirm('Are you sure you want to delete this car?')) {
        try {
            await supabase.from('cars').delete().eq('id', carId);
            cars = (await supabase.from('cars').select('*')).data;
            showNotification('Car deleted successfully!', 'success');
            loadCars();
        } catch (error) {
            console.error('Error deleting car:', error);
            showNotification('Failed to delete car!', 'error');
        }
    }
}

// Search cars
async function searchCars() {
    console.log('Searching cars'); // Debug log
    const searchTerm = document.getElementById('search-cars').value.toLowerCase();
    const { data, error } = await supabase
        .from('cars')
        .select('*')
        .or(`make.ilike.*${searchTerm}*,model.ilike.*${searchTerm}*,color.ilike.*${searchTerm}*,year.eq.${searchTerm}`);
    if (error) {
        console.error('Search cars error:', error);
        showNotification('Failed to search cars!', 'error');
        return;
    }
    cars = data;
    const adminGrid = document.getElementById('admin-cars-grid');
    if (adminGrid) {
        adminGrid.innerHTML = '';
        cars.forEach(car => {
            const carCard = createCarCard(car, true, true);
            adminGrid.appendChild(carCard);
        });
    }
}

// Load available cars
async function loadAvailableCars() {
    console.log('Loading available cars');
    const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('status', 'available');
    if (error) {
        console.error('Load available cars error:', error);
        showNotification('Failed to load available cars!', 'error');
        return;
    }
    const availableCars = data;
    const availableGrid = document.getElementById('available-cars-grid');
    if (availableGrid) {
        availableGrid.innerHTML = '';
        if (availableCars.length === 0) {
            availableGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-4xl">🚙</span>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">No Cars Available</h3>
                    <p class="text-gray-600">Check back later for new arrivals!</p>
                </div>
            `;
            return;
        }
        availableCars.forEach(car => {
            const availableCard = createCarCard(car, false);
            availableGrid.appendChild(availableCard);
        });
    }
}

// Load customers
async function loadCustomers() {
    if (userRole !== 'admin') return;
    console.log('Loading customers');
    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
        console.error('Load customers error:', error);
        showNotification('Failed to load customers!', 'error');
        return;
    }
    customers = data;
    const customersList = document.getElementById('customers-list');
    if (customersList) {
        customersList.innerHTML = '';
        if (customers.length === 0) {
            customersList.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No customers found. Add your first customer!</div>';
            return;
        }
        customers.forEach(customer => {
            const customerCard = document.createElement('div');
            customerCard.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden';
            customerCard.innerHTML = `
                <div class="bg-gradient-to-r from-red-500 to-red-600 p-4">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            ${customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="ml-3">
                            <h3 class="text-white font-semibold text-lg">${customer.name}</h3>
                            <p class="text-red-100 text-sm">Customer ID: #${customer.id}</p>
                        </div>
                    </div>
                </div>
                
                <div class="p-6">
                    <div class="space-y-3 mb-6">
                        <div class="flex items-center text-gray-600">
                            <span class="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                            </span>
                            <span class="text-sm">${customer.email}</span>
                        </div>
                        <div class="flex items-center text-gray-600">
                            <span class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                            </span>
                            <span class="text-sm">${customer.phone}</span>
                        </div>
                        <div class="flex items-start text-gray-600">
                            <span class="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                            </span>
                            <span class="text-sm">${customer.address}</span>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <div class="text-xs text-gray-500">
                        </div>
                        <button onclick="deleteCustomer(${customer.id})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            customersList.appendChild(customerCard);
        });
    }
}

// Show add customer modal
function showAddCustomerModal() {
    console.log('Showing add customer modal'); // Debug log
    const modal = document.getElementById('add-customer-modal');
    if (modal) modal.style.display = 'block';
}

// Close add customer modal
function closeAddCustomerModal() {
    console.log('Closing add customer modal'); // Debug log
    const modal = document.getElementById('add-customer-modal');
    if (modal) modal.style.display = 'none';
}

// Handle adding a customer
async function handleAddCustomer(e) {
    e.preventDefault();
    console.log('Handling add customer'); // Debug log
    const customerData = {
        name: document.getElementById('customer-name-input').value,
        email: document.getElementById('customer-email-input').value,
        phone: document.getElementById('customer-phone-input').value,
        address: document.getElementById('customer-address-input').value,
        password_hash: document.getElementById('customer-password-input').value
    };
    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();
        if (error) {
            console.error('Add customer error:', error);
            throw error;
        }
        customers = (await supabase.from('customers').select('*')).data;
        showNotification('Customer added successfully!', 'success');
        e.target.reset();
        closeAddCustomerModal();
        loadCustomers();
    } catch (error) {
        console.error('Error adding customer:', error);
        showNotification('Failed to add customer!', 'error');
    }
}

// Delete a customer
async function deleteCustomer(customerId) {
    console.log(`Deleting customer ID: ${customerId}`); // Debug log
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            await supabase.from('customers').delete().eq('id', customerId);
            customers = (await supabase.from('customers').select('*')).data;
            showNotification('Customer deleted successfully!', 'success');
            loadCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            showNotification('Failed to delete customer!', 'error');
        }
    }
}

// Load customer cars
async function loadCustomerCars() {
    if (!currentCustomer) return;
    console.log('Loading customer cars'); // Debug log
    try {
        const { data: purchaseData, error: purchaseError } = await supabase
            .from('purchases')
            .select('*, cars(*)')
            .eq('customer_id', currentCustomer.id)
            .eq('status', 'completed');
        if (purchaseError) {
            console.error('Load customer cars error:', purchaseError);
            showNotification('Failed to load purchased cars!', 'error');
            return;
        }
        const customerCarsGrid = document.getElementById('customer-cars-grid');
        if (customerCarsGrid) {
            customerCarsGrid.innerHTML = '';
            if (purchaseData.length === 0) {
                customerCarsGrid.innerHTML = '<div style="text-align: center; padding: 50px; color: #666;">No cars purchased yet.</div>';
                return;
            }
            purchaseData.forEach(purchase => {
                const customerCard = createCustomerCarCard(purchase.cars, purchase);
                customerCarsGrid.appendChild(customerCard);
            });
        }
    } catch (error) {
        console.error('Unexpected error in loadCustomerCars:', error);
        showNotification('An unexpected error occurred!', 'error');
    }
}

// Create customer car card with Base64 images
function createCustomerCarCard(car, purchase) {
    console.log(`Creating customer car card for ${car.make} ${car.model}`);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100';
    
    const shippingInfo = purchase.shipping_info || {};
    const arrivalDate = shippingInfo.arrival_date ? new Date(shippingInfo.arrival_date).toLocaleDateString() : 'N/A';
    const departureDate = shippingInfo.departure_date ? new Date(shippingInfo.departure_date).toLocaleDateString() : 'N/A';
    const placeholderImage = 'https://placehold.co/300x200/dc2626/white?text=Your+Car';
    const mainImage = car.images && car.images.length > 0 ? car.images[0] : placeholderImage;
    
    card.innerHTML = `
        <div class="relative">
            <img src="${mainImage}" alt="${car.make} ${car.model}" class="w-full h-48 object-cover">
            <div class="absolute top-3 right-3">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                    OWNED
                </span>
            </div>
            <div class="absolute top-3 left-3">
                <span class="px-2 py-1 rounded text-xs font-semibold bg-white bg-opacity-90 text-gray-700">
                    #${car.id}
                </span>
            </div>
        </div>
        
        <div class="p-6">
            <div class="mb-4">
                <h3 class="text-xl font-bold text-gray-900 mb-1">${car.make} ${car.model}</h3>
                <p class="text-gray-600">${car.year}</p>
            </div>
            
            <!-- Payment Status -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-green-800 mb-2 flex items-center">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Payment Status
                </h4>
                <div class="text-sm space-y-1">
                    <div class="flex justify-between text-green-700">
                        <span>Vehicle Price:</span>
                        <span class="bold"> JP¥ ${car.price.toLocaleString()} (Paid)</span>
                    </div>
                    <div class="flex justify-between text-green-700">
                        <span>Balance:</span>
                        <span class="font-semibold"> JP¥ 0</span>
                    </div>
                </div>
            </div>
            
            <!-- Shipping Information -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="font-semibold text-blue-800 mb-3 flex items-center">
                    <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Shipping Information
                </h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span class="text-gray-600 block">From Port:</span>
                        <span class="font-medium text-gray-900">${shippingInfo.from_port || 'N/A'}</span>
                    </div>
                    <div>
                        <span class="text-gray-600 block">Departure:</span>
                        <span class="font-medium text-gray-900">${departureDate}</span>
                    </div>
                    <div>
                        <span class="text-gray-600 block">Arrival Port:</span>
                        <span class="font-medium text-gray-900">${shippingInfo.arrival_port || 'N/A'}</span>
                    </div>
                    <div>
                        <span class="text-gray-600 block">Arrival:</span>
                        <span class="font-medium text-gray-900">${arrivalDate}</span>
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-blue-200">
                    <div class="text-sm">
                        <span class="text-gray-600 block">Consignee:</span>
                        <span class="font-medium text-gray-900">${shippingInfo.consignee || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Vehicle Specifications -->
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 class="font-semibold text-gray-800 mb-3 flex items-center">
                    <span class="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                    Vehicle Specifications
                </h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Chassis:</span>
                        <span class="font-medium text-gray-900">${car.vin}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Mileage:</span>
                        <span class="font-medium text-gray-900">${car.mileage.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Fuel:</span>
                        <span class="font-medium text-gray-900">${car.fuel_type}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Color:</span>
                        <span class="font-medium text-gray-900">${car.color}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Transmission:</span>
                        <span class="font-medium text-gray-900">${car.transmission}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Engine CC:</span>
                        <span class="font-medium text-gray-900">${car.engine_cc}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Doors:</span>
                        <span class="font-medium text-gray-900">${car.doors}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Seats:</span>
                        <span class="font-medium text-gray-900">${car.seats}</span>
                    </div>
                </div>
            </div>
            
            ${car.images && car.images.length > 1 ? `
                <div class="mt-4">
                    <h5 class="text-sm font-medium text-gray-700 mb-2">Gallery</h5>
                    <div class="flex gap-2 overflow-x-auto">
                        ${car.images.slice(0, 4).map(img => `
                            <img src="${img || placeholderImage}" alt="Car image" class="thumbnail border-2 border-gray-200 hover:border-red-500">
                        `).join('')}
                        ${car.images.length > 4 ? `<div class="w-12 h-8 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">+${car.images.length - 4}</div>` : ''}
                    </div>
                </div>
            ` : ''}
           
<div class="mt-4 pt-4 border-t border-gray-200">
    <button onclick="showCustomerCarDetails(${car.id}, ${purchase.id})" class="w-full bg-primary hover:bg-secondary text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
        <span class="mr-2">🔍</span>
        View Details
    </button>
</div>
        </div>
    `;
    return card;
}

// Load purchase history
async function loadPurchaseHistory() {
    if (!currentCustomer) return;
    console.log('Loading purchase history');
    try {
        const { data: purchaseData, error } = await supabase
            .from('purchases')
            .select('*, cars(*)')
            .eq('customer_id', currentCustomer.id);
        if (error) {
            console.error('Load purchase history error:', error);
            showNotification('Failed to load purchase history!', 'error');
            return;
        }
        const purchaseList = document.getElementById('purchase-history-list');
        if (purchaseList) {
            purchaseList.innerHTML = '';
            if (purchaseData.length === 0) {
                purchaseList.innerHTML = `
                    <div class="text-center py-12">
                        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-4xl">🚗</span>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">No Purchase History</h3>
                        <p class="text-gray-600">You haven't made any purchases yet. Browse our available cars to get started!</p>
                    </div>
                `;
                return;
            }
            purchaseData.forEach(purchase => {
                const car = purchase.cars;
                const purchaseItem = document.createElement('div');
                purchaseItem.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden';
                
                const shippingInfo = purchase.shipping_info || {};
                const arrivalDate = shippingInfo.arrival_date ? new Date(shippingInfo.arrival_date).toLocaleDateString() : 'N/A';
                const departureDate = shippingInfo.departure_date ? new Date(shippingInfo.departure_date).toLocaleDateString() : 'N/A';
                const placeholderImage = 'https://placehold.co/150x100/dc2626/white?text=Car';
                const mainImage = car.images && car.images.length > 0 ? car.images[0] : placeholderImage;
                
                purchaseItem.innerHTML = `
                    <div class="flex flex-col md:flex-row">
                        <div class="md:w-48 h-48 md:h-auto">
                            <img src="${mainImage}" alt="${car.make} ${car.model}" class="w-full h-full object-contain">
                        </div>
                        
                        <div class="flex-1 p-6">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900">${car.make} ${car.model}</h3>
                                    <p class="text-gray-600">${car.year}</p>
                                </div>
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-primary"> JP¥ ${purchase.purchase_price.toLocaleString()}</div>
                                    <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                        ${purchase.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <h4 class="font-semibold text-gray-800 text-sm mb-2">Purchase Details</h4>
                                    <div class="text-sm space-y-1">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Date:</span>
                                            <span class="font-medium">${new Date(purchase.purchase_date).toLocaleDateString()}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Order ID:</span>
                                            <span class="font-medium">#${purchase.id}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-blue-50 rounded-lg p-3">
                                    <h4 class="font-semibold text-blue-800 text-sm mb-2">Shipping Status</h4>
                                    <div class="text-sm space-y-1">
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">From:</span>
                                            <span class="font-medium text-blue-700">${shippingInfo.from_port || 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">To:</span>
                                            <span class="font-medium text-blue-700">${shippingInfo.arrival_port || 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-gray-600">Arrival:</span>
                                            <span class="font-medium text-blue-700">${arrivalDate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                purchaseList.appendChild(purchaseItem);
            });
        }
    } catch (error) {
        console.error('Unexpected error in loadPurchaseHistory:', error);
        showNotification('An unexpected error occurred!', 'error');
    }
}

// Show allocate modal
async function showAllocateModal(carId) {
    console.log(`Showing allocate modal for car ID: ${carId}`); // Debug log
    const car = cars.find(c => c.id === carId);
    if (!car) {
        showNotification('Car not found!', 'error');
        return;
    }
    const allocateModal = document.getElementById('allocate-modal');
    if (!allocateModal) return;
    document.getElementById('allocate-car-id').value = carId;
    const customerSelect = document.getElementById('allocate-customer-id');
    customerSelect.innerHTML = '<option value="">Select a Customer</option>';
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.name} (${customer.email})`;
        customerSelect.appendChild(option);
    });
    customerSelect.addEventListener('change', () => {
        const selectedCustomer = customers.find(c => c.id === parseInt(customerSelect.value));
        if (selectedCustomer) {
            document.getElementById('shipping-consignee').value = selectedCustomer.name;
            document.getElementById('shipping-consignee-address').value = selectedCustomer.address;
        } else {
            document.getElementById('shipping-consignee').value = '';
            document.getElementById('shipping-consignee-address').value = '';
        }
    });
    allocateModal.style.display = 'block';
}

// Close allocate modal
function closeAllocateModal() {
    console.log('Closing allocate modal'); // Debug log
    const modal = document.getElementById('allocate-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('allocate-form').reset();
    }
}

// Show edit car modal
function showEditModal(carId) {
    console.log(`Showing edit modal for car ID: ${carId}`); // Debug log
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    document.getElementById('edit-make').value = car.make;
    document.getElementById('edit-model').value = car.model;
    document.getElementById('edit-year').value = car.year;
    document.getElementById('edit-price').value = car.price;
    document.getElementById('edit-mileage').value = car.mileage;
    document.getElementById('edit-fuel_type').value = car.fuel_type;
    document.getElementById('edit-color').value = car.color;
    document.getElementById('edit-transmission').value = car.transmission;
    document.getElementById('edit-engine_cc').value = car.engine_cc;
    document.getElementById('edit-doors').value = car.doors;
    document.getElementById('edit-seats').value = car.seats;
    document.getElementById('edit-registration_year').value = car.registration_year;
    document.getElementById('edit-vin').value = car.vin;
    document.getElementById('edit-additional_details').value = car.additional_details || ''; // ADD THIS LINE
    document.getElementById('edit-car-id').value = carId;
    const existingImagesDiv = document.getElementById('edit-existing-images');
    if (existingImagesDiv) {
        existingImagesDiv.innerHTML = '';
        if (car.images && car.images.length > 0) {
            car.images.forEach(img => {
                const imgElement = document.createElement('img');
                imgElement.src = img;
                imgElement.className = 'thumbnail';
                imgElement.alt = 'Existing car image';
                existingImagesDiv.appendChild(imgElement);
            });
        }
    }
    document.getElementById('edit-car-form').dataset.carId = carId;
    const editModal = document.getElementById('edit-car-modal');
    if (editModal) editModal.style.display = 'block';
}

// Close edit car modal
function closeEditModal() {
    console.log('Closing edit car modal'); // Debug log
    const modal = document.getElementById('edit-car-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('edit-car-form').reset();
        document.getElementById('edit-existing-images').innerHTML = '';
    }
}

// Show notification
function showNotification(message, type) {
    console.log(`Showing notification: ${message}, Type: ${type}`); // Debug log
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }
}