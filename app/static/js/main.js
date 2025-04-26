document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearBtn');
    const stockSymbolInput = document.getElementById('stockSymbol');
    const errorMessage = document.getElementById('errorMessage');
    const resultsTabs = document.getElementById('resultsTabs');
    const tabContents = document.querySelectorAll('.tab-content');

    searchBtn.addEventListener('click', performSearch);
    stockSymbolInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    stockSymbolInput.addEventListener('input', function() {
        if (this.value.trim()) {
            this.setCustomValidity('');
        } else {
            this.setCustomValidity('Please fill out this field.');
        }
    });

    async function performSearch() {
        const symbol = stockSymbolInput.value.trim().toUpperCase();
        
        if (!symbol) {
            stockSymbolInput.reportValidity();
            return;
        }

        // Show loading state
        searchBtn.disabled = true;
        searchBtn.textContent = 'Loading...';
        errorMessage.textContent = '';
        errorMessage.classList.remove('show');
        hideAllTabs();

        try {
            const response = await fetch(`/api/stock/${symbol}`);
            const data = await response.json();

            if (response.ok) {
                stockSymbolInput.value = symbol;
                errorMessage.textContent = '';
                errorMessage.classList.remove('show');
                displayResults(data);
                resultsTabs.style.display = 'block';
            } else {
                stockSymbolInput.value = symbol;
                errorMessage.textContent = data.error;
                errorMessage.classList.add('show');
                resultsTabs.style.display = 'none';
                hideAllTabs();
            }
        } catch (error) {
            console.error('Error:', error);
            stockSymbolInput.value = symbol;
            errorMessage.textContent = 'Error : No record has been found, please enter a valid symbol.';
            errorMessage.classList.add('show');
            resultsTabs.style.display = 'none';
            hideAllTabs();
        } finally {
            // Reset button state
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search';
        }
    }

    clearBtn.addEventListener('click', function() {
        stockSymbolInput.value = '';
        errorMessage.textContent = '';
        errorMessage.classList.remove('show');
        resultsTabs.style.display = 'none';
        hideAllTabs();
    });

    // Tab switching functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            // Show selected tab content while maintaining input value
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(tabId).style.display = 'block';
            
            // Ensure input value is maintained
            const symbol = stockSymbolInput.value.trim();
            if (symbol) {
                stockSymbolInput.value = symbol;  // ✅ Maintain input value during tab switches
            }
        });
    });

    function hideAllTabs() {
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
    }

    function displayResults(data) {
        const companyOutlook = document.getElementById('companyOutlook');
        const stockSummary = document.getElementById('stockSummary');

        // Display company information
        if (data.company_info) {
            companyOutlook.innerHTML = createCompanyTable(data.company_info);
        }

        // Display stock summary
        if (data.stock_summary) {
            stockSummary.innerHTML = createStockSummaryTable(data.stock_summary);
        }

        // Show the first tab by default
        document.querySelector('.tab-button').click();
    }

    function truncateDescription(description, lineCount = 5) {
        if (!description) return '';
        
        // Create a temporary div to measure text
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = `
            position: absolute;
            width: ${document.querySelector('table').offsetWidth * 0.6}px;
            visibility: hidden;
            font-size: inherit;
            line-height: 1.2em;
            padding: 10px;
        `;
        tempDiv.textContent = description;
        document.body.appendChild(tempDiv);
        
        // Calculate line height and total height for 5 lines
        const lineHeight = parseInt(getComputedStyle(tempDiv).lineHeight);
        const maxHeight = lineHeight * lineCount;
        
        // If content fits within 5 lines, return as is
        if (tempDiv.offsetHeight <= maxHeight) {
            document.body.removeChild(tempDiv);
            return description;
        }
        
        // Binary search to find the right truncation point
        let start = 0;
        let end = description.length;
        let bestFit = '';
        
        while (start <= end) {
            const mid = Math.floor((start + end) / 2);
            const truncated = description.slice(0, mid) + '...';
            tempDiv.textContent = truncated;
            
            if (tempDiv.offsetHeight <= maxHeight) {
                bestFit = truncated;
                start = mid + 1;
            } else {
                end = mid - 1;
            }
        }
        
        document.body.removeChild(tempDiv);
        return bestFit;
    }

    function createCompanyTable(info) {
        const truncatedDescription = truncateDescription(info.description);
        return `
            <table>
                <tr><td>Company Name</td><td>${info.name || ''}</td></tr>
                <tr><td>Stock Ticker Symbol</td><td>${info.symbol || ''}</td></tr>
                <tr><td>Stock Exchange Code</td><td>${info.exchange || ''}</td></tr>
                <tr><td>Company Start Date</td><td>${info.startDate || ''}</td></tr>
                <tr>
                    <td>Description</td>
                    <td class="description-container">
                        <div class="description-cell">${truncatedDescription}</div>
                    </td>
                </tr>
            </table>
        `;
    }

    function createStockSummaryTable(summary) {
        return `
            <table>
                <tr><td>Stock Ticker Symbol</td><td>${summary.symbol}</td></tr>
                <tr><td>Trading Day</td><td>${summary.tradingDay}</td></tr>
                <tr><td>Previous Closing Price</td><td>${summary.prevClose}</td></tr>
                <tr><td>Opening Price</td><td>${summary.open}</td></tr>
                <tr><td>High Price</td><td>${summary.high}</td></tr>
                <tr><td>Low Price</td><td>${summary.low}</td></tr>
                <tr><td>Last Price</td><td>${summary.last}</td></tr>
                <tr>
                    <td>Change</td>
                    <td class="${summary.change.includes('-') ? 'negative' : 'positive'}">${summary.change}</td>
                </tr>
                <tr>
                    <td>Change Percent</td>
                    <td class="${summary.changePercent.includes('-') ? 'negative' : 'positive'}">${summary.changePercent}</td>
                </tr>
                <tr><td>Number of Shares Traded</td><td>${summary.volume}</td></tr>
            </table>
        `;
    }

    // Add resize handler to readjust truncation if needed
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            const descriptionCell = document.querySelector('.description-cell');
            if (descriptionCell && window.lastDescription) {
                descriptionCell.textContent = truncateDescription(window.lastDescription);
            }
        }, 250);
    });
}); 