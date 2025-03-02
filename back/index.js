const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Reusable function for storing sensor data
async function storeSensorData(sensor, value, res) {
  try {
    const data = {};
    // Check the sensor and assign the appropriate field value
    if (sensor === 'temperature') {
      data.temperature = value;
    } else if (sensor === 'humidity') {
      data.humidity = value;
    } else if (sensor === 'soil_moisture') {
      data.soil_moisture = value;
    } else if (sensor === 'ldr') {
      data.ldr = value;
    } else if (sensor === 'water_level') {
      data.water_level = value;
    } else {
      return res.status(400).json({ error: 'Invalid sensor type' });
    }

    // Store data in SensorReading
    const newData = await prisma.sensorReading.create({
      data: data,
    });

    res.status(201).json({ message: `${sensor} data stored`, newData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

async function getAllSensorData(req, res) {
  try {
    // ดึงข้อมูลทั้งหมดจาก SensorReading โดยเรียงตามเวลา (ล่าสุดก่อน)
    const data = await prisma.sensorReading.findMany({
      orderBy: { readingTime: 'desc' }, // เรียงข้อมูลตามเวลา
      take: 10, // จำกัดการดึงข้อมูลแค่ 10 แถวล่าสุด
    });

    // ส่งข้อมูลที่ได้จากฐานข้อมูลกลับไป
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Define GET route for all sensors data
app.get('/sensor_data', getAllSensorData);

const sensors = ['temperature', 'humidity', 'soil_moisture', 'ldr', 'water_level'];

// Reusable function for retrieving latest sensor data
async function getSensorData(sensor, res) {
  try {
    // ตรวจสอบว่าเซ็นเซอร์ที่ต้องการมีหรือไม่
    if (!['temperature', 'humidity', 'soil_moisture', 'ldr', 'water_level'].includes(sensor)) {
      return res.status(400).json({ error: 'Invalid sensor type' });
    }

    // ดึงข้อมูลตามเซ็นเซอร์ที่ระบุ
    const data = await prisma.sensorReading.findMany({
      where: {
        // กรองข้อมูลจากเซ็นเซอร์ที่ต้องการ
        [sensor]: { not: null },
      },
      orderBy: { readingTime: 'desc' },
      take: 10,
    });

    // ส่งข้อมูลที่ได้จากฐานข้อมูลกลับไป
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Define GET routes for each sensor
sensors.forEach((sensor) => {
  app.get(`/sensor_data/${sensor}`, (req, res) => getSensorData(sensor, res));
});

// Define POST and GET routes for each sensor
sensors.forEach((sensor) => {
  app.post(`/${sensor}_data`, (req, res) => {
    const value = req.body.value;
    if (value === undefined) {
      return res.status(400).json({ error: 'Missing field: value' });
    }
    storeSensorData(sensor, value, res);
  });
  
  app.get(`/${sensor}_data`, (req, res) => getSensorData(sensor, res));
});

// Actuator Control API
app.post('/control_actuator', async (req, res) => {
  try {
    const { action, value, type } = req.body;
    if (!action || value === undefined || !type) {
      return res.status(400).json({ error: 'Missing required fields: action, value, and type' });
    }

    // บันทึกข้อมูลการควบคุม actuator ลงใน ActuatorLog
    const actuatorLog = await prisma.actuatorLog.create({
      data: { action, value, type },
    });

    res.status(201).json({ message: 'Actuator command logged successfully', actuatorLog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/all_sensor_data', async (req, res) => {
  try {
    // รับข้อมูลจาก request body
    const { temperature, humidity, soil_moisture, ldr, water_level } = req.body;

    // ตรวจสอบว่าข้อมูลที่จำเป็นครบหรือไม่
    if (temperature === undefined || humidity === undefined || soil_moisture === undefined || ldr === undefined || water_level === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // สร้างข้อมูลใหม่ในฐานข้อมูล
    const newSensorReading = await prisma.sensorReading.create({
      data: {
        temperature,
        humidity,
        soil_moisture,
        ldr,
        water_level,
        readingTime: new Date(), // บันทึกเวลาปัจจุบัน
      },
    });

    // ส่งข้อมูลที่ถูกบันทึกกลับไป
    res.status(201).json({ message: 'Sensor data stored successfully', newSensorReading });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});