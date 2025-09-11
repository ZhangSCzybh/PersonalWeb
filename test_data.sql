-- 插入测试充电记录数据
-- 为浙A88888奔驰E300插入充电记录
INSERT INTO charging_records (vehicle_id, date, location, previous_mileage, current_mileage, distance_driven, meter_kwh, battery_before, battery_after, car_kwh, energy_loss, amount, notes) VALUES
(1, '2024-01-15', '国家电网杭州西湖区充电站', 15000.5, 15250.8, 250.3, 45.2, 15, 85, 42.8, 2.4, 67.8, '日常充电'),
(1, '2024-01-22', '特来电杭州滨江区充电站', 15250.8, 15480.2, 229.4, 41.5, 20, 90, 39.2, 2.3, 62.3, '周末出行'),
(1, '2024-02-05', '国家电网杭州西湖区充电站', 15480.2, 15720.7, 240.5, 43.8, 18, 88, 41.2, 2.6, 65.7, '日常充电'),
(1, '2024-02-15', '星星充电杭州上城区充电站', 15720.7, 15965.3, 244.6, 44.1, 22, 92, 41.5, 2.6, 66.2, '商务出行'),
(1, '2024-02-28', '国家电网杭州西湖区充电站', 15965.3, 16210.9, 245.6, 44.5, 19, 87, 41.9, 2.6, 66.8, '日常充电');

-- 为浙AD82871小鹏X9插入充电记录
INSERT INTO charging_records (vehicle_id, date, location, previous_mileage, current_mileage, distance_driven, meter_kwh, battery_before, battery_after, car_kwh, energy_loss, amount, notes) VALUES
(5, '2024-01-10', '小鹏超充杭州西湖区站', 8000.2, 8250.7, 250.5, 55.8, 25, 95, 52.5, 3.3, 83.7, '长途出行'),
(5, '2024-01-18', '国家电网杭州余杭区充电站', 8250.7, 8480.3, 229.6, 51.2, 20, 88, 48.1, 3.1, 76.8, '日常通勤'),
(5, '2024-02-01', '小鹏超充杭州滨江区站', 8480.3, 8720.8, 240.5, 53.7, 22, 92, 50.5, 3.2, 80.6, '周末出游'),
(5, '2024-02-20', '特来电杭州拱墅区充电站', 8720.8, 8965.4, 244.6, 54.2, 18, 90, 50.9, 3.3, 81.3, '商务出差'),
(5, '2024-03-01', '小鹏超充杭州西湖区站', 8965.4, 9210.2, 244.8, 54.5, 21, 93, 51.2, 3.3, 81.8, '日常通勤');

-- 为浙AD82872小鹏X9插入充电记录
INSERT INTO charging_records (vehicle_id, date, location, previous_mileage, current_mileage, distance_driven, meter_kwh, battery_before, battery_after, car_kwh, energy_loss, amount, notes) VALUES
(2, '2024-01-12', '国家电网杭州西湖区充电站', 5000.1, 5250.6, 250.5, 55.8, 25, 95, 52.5, 3.3, 83.7, '首次充电'),
(2, '2024-01-25', '特来电杭州滨江区充电站', 5250.6, 5480.1, 229.5, 51.2, 20, 88, 48.1, 3.1, 76.8, '日常通勤'),
(2, '2024-02-10', '星星充电杭州上城区充电站', 5480.1, 5720.9, 240.8, 53.7, 22, 92, 50.5, 3.2, 80.6, '周末出游');

-- 为沪B67890宝马X5插入充电记录
INSERT INTO charging_records (vehicle_id, date, location, previous_mileage, current_mileage, distance_driven, meter_kwh, battery_before, battery_after, car_kwh, energy_loss, amount, notes) VALUES
(3, '2024-01-20', '国家电网上海浦东新区充电站', 12000.3, 12250.7, 250.4, 45.1, 15, 85, 42.7, 2.4, 67.6, '日常充电'),
(3, '2024-02-05', '特来电上海徐汇区充电站', 12250.7, 12480.9, 230.2, 41.8, 20, 90, 39.5, 2.3, 62.7, '商务出行');