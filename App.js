import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Button,
  TextInput,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import * as Network from "expo-network";
import * as SQLite from "expo-sqlite";

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [meterNo, setMeterNo] = useState("");
  const [areaId, setAreaId] = useState("");
  const [meterSize, setMeterSize] = useState("");
  const [isAddUserVisible, setIsAddUserVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [db, setDb] = useState(null); // SQLite database reference
  const [offlineDB, setOfflineDB] = useState([]);

  // Open and initialize SQLite database
  useEffect(() => {
    const openDatabase = async () => {
      try {
        const database = await SQLite.openDatabaseAsync("OfflineDB.db");
        setDb(database);
        await initializeDatabase(database);
      } catch (error) {
        console.log("Failed to open database:", error);
      }
    };

    const initializeDatabase = async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY NOT NULL, 
          name TEXT NOT NULL, 
          type TEXT NOT NULL,
          address TEXT NOT NULL, 
          status TEXT NOT NULL,
          area_id TEXT NOT NULL,
          meter_size TEXT NOT NULL, 
          meter_no TEXT NOT NULL
        );
      `);
      console.log("SQLite Database Initialized.");
    };

    openDatabase();
  }, []);

  useEffect(() => {
    const checkNetworkAndServer = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        setIsOnline(networkState.isConnected);
        console.log(
          `Network status: ${networkState.isConnected ? "Online" : "Offline"}`
        );

        if (networkState.isConnected) {
          const response = await axios.get("http://192.168.8.33:3000/accounts");
          setAccounts(response.data);
        } else {
          fetchOfflineAccounts();
        }
      } catch (error) {
        console.error("Error checking server status:", error.message);
      }
    };

    checkNetworkAndServer();
    const interval = setInterval(checkNetworkAndServer, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch offline accounts from SQLite
  const fetchOfflineAccounts = async () => {
    if (db) {
      const result = await db.execAsync("SELECT * FROM accounts;");
      setAccounts(result.rows._array);
    }
  };

  const handleSave = () => {
    const updatedAccount = {
      ...editingAccount,
      name,
      type,
      address,
      status,
      meter_no: meterNo,
      area_id: areaId,
      meter_size: meterSize,
    };

    if (isOnline) {
      axios
        .put(
          `http://192.168.8.34:3000/accounts/${editingAccount.id}`,
          updatedAccount
        )
        .then(() => {
          setAccounts(
            accounts.map((account) =>
              account.id === editingAccount.id ? updatedAccount : account
            )
          );
          setEditingAccount(null);
        })
        .catch((error) => {
          console.error("Error updating account:", error);
        });
    } else {
      // Save to SQLite when offline
      if (db) {
        console.log("App is offline. Updating user in SQLite...");
        db.runAsync(
          "UPDATE accounts SET name = ?, type = ?, address = ?, status = ?, area_id = ?, meter_no = ?, meter_size = ? WHERE id = ?",
          [
            name,
            type,
            address,
            status,
            areaId,
            meterNo,
            meterSize,
            editingAccount.id,
          ]
        );
        setAccounts(
          accounts.map((account) =>
            account.id === editingAccount.id ? updatedAccount : account
          )
        );
        setEditingAccount(null);
        console.log("User updated in SQLite successfully!");
      }
    }
  };

  const handleAddUser = () => {
    const newAccount = {
      name,
      type,
      address,
      status,
      meter_no: meterNo ? parseInt(meterNo, 10) : null,
      area_id: areaId ? parseInt(areaId, 10) : null,
      meter_size: meterSize ? parseInt(meterSize, 10) : null,
    };

    if (isOnline) {
      axios
        .post("http://192.168.8.33:3000/accounts", newAccount)
        .then((response) => {
          setAccounts([...accounts, response.data]);
          setIsAddUserVisible(false);
          resetForm();
        })
        .catch((error) => {
          console.error("Error adding account:", error);
        });
    } else {
      // Save to SQLite when offline
      if (db) {
        console.log("App is offline. Adding user to SQLite...");
        db.runAsync(
          "INSERT INTO accounts (name, type, address, status, area_id, meter_no, meter_size) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            name,
            type,
            address,
            status,
            areaId ? parseInt(areaId, 10) : null,
            meterNo ? parseInt(meterNo, 10) : null,
            meterSize ? parseInt(meterSize, 10) : null,
          ]
        );
        fetchOfflineAccounts(); // Refresh the list
        setIsAddUserVisible(false);
        resetForm();
        console.log("User added to SQLite successfully!");
      }
    }
  };

  const resetForm = () => {
    setName("");
    setType("");
    setAddress("");
    setStatus("");
    setMeterNo("");
    setAreaId("");
    setMeterSize("");
    setEditingAccount(null);
    setIsAddUserVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Accounts List</Text>
      <Button
        title="Add User"
        onPress={() => setIsAddUserVisible(true)}
        color="#4CAF50"
      />

      {(isAddUserVisible || editingAccount) && (
        <View style={styles.editForm}>
          <Text style={styles.subheading}>
            {editingAccount ? "Edit Account" : "Add New Account"}
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter account name"
          />
          <Picker
            selectedValue={type}
            onValueChange={(itemValue) => setType(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Type" value="" />
            <Picker.Item label="Commercial" value="commercial" />
            <Picker.Item label="Residential" value="residential" />
          </Picker>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter account address"
          />
          <Picker
            selectedValue={status}
            onValueChange={(itemValue) => setStatus(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Status" value="" />
            <Picker.Item label="Active" value="active" />
            <Picker.Item label="Inactive" value="inactive" />
          </Picker>
          <TextInput
            style={styles.input}
            value={meterNo}
            onChangeText={setMeterNo}
            placeholder="Enter meter number"
          />
          <View style={styles.buttonContainer}>
            {editingAccount ? (
              <Button
                title="Save Changes"
                onPress={handleSave}
                color="#4CAF50"
              />
            ) : (
              <Button
                title="Add User"
                onPress={handleAddUser}
                color="#4CAF50"
              />
            )}
            <Button title="Cancel" onPress={resetForm} color="#f44336" />
          </View>
        </View>
      )}

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.accountItem}>
            <Text style={styles.accountName}>Name: {item.name}</Text>
            <Text>Type: {item.type}</Text>
            <Text>Address: {item.address}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Meter No: {item.meter_no}</Text>
            <Text>Area ID: {item.area_id}</Text>
            <Text>Meter Size: {item.meter_size}</Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Edit"
                onPress={() => {
                  setName(item.name);
                  setType(item.type);
                  setAddress(item.address);
                  setStatus(item.status);
                  setMeterNo(item.meter_no);
                  setAreaId(item.area_id);
                  setMeterSize(item.meter_size);
                  setEditingAccount(item);
                  setIsAddUserVisible(true);
                }}
                color="#2196F3"
              />
            </View>
          </View>
        )}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subheading: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
  },
  picker: {
    height: 50,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editForm: {
    marginBottom: 20,
  },
  accountItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  accountName: {
    fontWeight: "bold",
    fontSize: 16,
  },
});

