import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import axios from "axios";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [relayStatus, setRelayStatus] = useState(false);
  const [ledStatus, setLedStatus] = useState(false);
  const [loading, setLoading] = useState(true); // เพิ่มสถานะการโหลดข้อมูล
  const [error, setError] = useState(null); // เพิ่มสถานะข้อผิดพลาด

  const fetchSensorData = async () => {
    setLoading(true);
    setError(null); // เคลียร์ข้อผิดพลาดก่อน
    try {
      const response = await axios.get("http://localhost:8000/sensor_data");
      setSensorData(response.data);
      setLoading(false); // ข้อมูลถูกโหลดแล้ว
    } catch (error) {
      console.error("Error fetching sensor data", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล"); // เกิดข้อผิดพลาด
      setLoading(false); // ยุติการโหลด
    }
  };

  useEffect(() => {
    fetchSensorData();
    const intervalId = setInterval(fetchSensorData, 30000); // รีเฟรชข้อมูลทุก 30 วินาที
    return () => clearInterval(intervalId); // เคลียร์เมื่อออกจาก component
  }, []);

  const handleRelayToggle = async () => {
    try {
      const newStatus = !relayStatus;
      setRelayStatus(newStatus);
      await axios.post("http://localhost:8000/control_actuator", {
        action: newStatus ? "ON" : "OFF",
        value: newStatus,
        type: "relay",
      });
    } catch (error) {
      console.error("Error controlling relay", error);
    }
  };

  const handleLedToggle = async () => {
    try {
      const newStatus = !ledStatus;
      setLedStatus(newStatus);
      await axios.post("http://localhost:8000/control_actuator", {
        action: newStatus ? "ON" : "OFF",
        value: newStatus,
        type: "led",
      });
    } catch (error) {
      console.error("Error controlling LED", error);
    }
  };

  const chartData = {
    labels: sensorData.map((item) => new Date(item.readingTime).toLocaleTimeString()),
    datasets: [
      {
        label: "Temperature (°C)",
        data: sensorData.map((item) => item.temperature),
        borderColor: "#ff6384",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "Humidity (%)",
        data: sensorData.map((item) => item.humidity),
        borderColor: "#36a2eb",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "Soil Moisture (%)",
        data: sensorData.map((item) => item.soil_moisture),
        borderColor: "#ff9f40",
        backgroundColor: "rgba(255, 159, 64, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "LDR (Light Intensity)",
        data: sensorData.map((item) => item.ldr),
        borderColor: "#4bc0c0",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "Water Level (%)",
        data: sensorData.map((item) => item.water_level),
        borderColor: "#9966ff",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 14 } }
      },
      title: {
        display: true,
        text: "Sensor Data Over Time",
        font: { size: 18 }
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        bodyFont: { size: 14 },
        titleFont: { size: 16 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, minRotation: 35 }
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" }
      }
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Smart Garden Dashboard</h1>
        <div className="status-indicator">
          <div className={`status-dot ${loading ? 'loading' : ''}`}></div>
          <span>{loading ? "Loading..." : "Live Data"}</span>
        </div>
      </header>

      <div className="centered-content">

        <div className="manual-control">
          <h3>Manual Control</h3>
          <div>
            <button onClick={handleRelayToggle}>
              {relayStatus ? "Turn Relay OFF" : "Turn Water Pump ON"}
            </button>
          </div>
          <div>
            <button onClick={handleLedToggle}>
              {ledStatus ? "Turn LED OFF" : "Turn LED ON"}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>} {/* แสดงข้อความข้อผิดพลาด */}

        <div className="sensor-table-container">
          <table className="sensor-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Temperature (°C)</th>
                <th>Humidity (%)</th>
                <th>Soil Moisture (%)</th>
                <th>LDR (Light Intensity)</th>
                <th>Water Level (%)</th>
              </tr>
            </thead>
            <tbody>
              {sensorData.map((item, index) => (
                <tr key={index}>
                  <td>{new Date(item.readingTime).toLocaleTimeString()}</td>
                  <td>{item.temperature}</td>
                  <td>{item.humidity}</td>
                  <td>{item.soil_moisture}</td>
                  <td>{item.ldr}</td>
                  <td>{item.water_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
