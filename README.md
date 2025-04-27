# MFAnalysis - Mutual Fund Analytics Dashboard

A professional mutual fund analysis website that provides real-time data visualization and insights for Indian mutual funds using the MFAPI.in API.

## Features

- **Search Functionality**: Find any mutual fund by name or scheme code
- **Real-time NAV Data**: Display current NAV and daily change
- **Interactive Charts**: Visualize fund performance over customizable time periods
- **Comprehensive Analytics**: View returns over 1-year, 3-year, and 5-year periods
- **Responsive Design**: Works perfectly on all devices (mobile, tablet, desktop)
- **Modern UI**: Built with Tailwind CSS for a sleek, professional appearance

## Technologies Used

- **HTML5**: Modern semantic markup
- **Tailwind CSS**: Utility-first CSS framework for styling
- **JavaScript**: Vanilla JS for DOM manipulation and API calls
- **Chart.js**: For interactive data visualization
- **Font Awesome**: For icons
- **MFAPI.in API**: For mutual fund data

## Setup Instructions

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/mfanalysis.git
   cd mfanalysis
   ```

2. Open the project in your code editor

3. Open `index.html` in your browser, or use a local development server:
   ```
   # Using Python
   python -m http.server
   
   # Using Node.js (with http-server)
   npx http-server
   ```

4. Start exploring mutual funds!

## API Usage

The application uses the free MFAPI.in API which provides:
- Mutual fund search functionality 
- Historical NAV data for all Indian mutual funds
- Scheme details (fund house, category, etc.)

API endpoints used:
- `https://api.mfapi.in/mf/search?q={query}` - For searching funds by name
- `https://api.mfapi.in/mf/{schemeCode}` - For getting fund details by scheme code

## Project Structure

- `index.html` - Main HTML file with the website structure
- `styles.css` - Custom CSS styling beyond Tailwind
- `script.js` - JavaScript for API calls and interactive features

## Future Enhancements

- Fund comparison feature
- Portfolio management and tracking
- Performance benchmarking against market indices
- Fund recommendation system
- Detailed fund information (fund manager, portfolio holdings, etc.)

## Credits

- [MFAPI.in](https://www.mfapi.in/) for providing the API
- [Tailwind CSS](https://tailwindcss.com/) for the CSS framework
- [Chart.js](https://www.chartjs.org/) for the charts
- [Font Awesome](https://fontawesome.com/) for the icons

## License

MIT License 