document.getElementById('search-button').addEventListener('click', function() {
    const searchText = document.getElementById('user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#user-table tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const userName = cells[1].textContent.toLowerCase();  // Name column
        const userEmail = cells[2].textContent.toLowerCase(); // Email column
        const userPhone = cells[3].textContent.toLowerCase(); // Phone column
        
        if (userName.includes(searchText) || userEmail.includes(searchText) || userPhone.includes(searchText)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});
