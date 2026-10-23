import { verifyScannedQR } from "../services/attendanceService";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

export default function QRScannerScreen({
  onClose,
  onQRScanned,
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      requestPermission();
    }
  }, [
    permission?.granted,
    permission?.canAskAgain,
    requestPermission,
  ]);


async function handleScan(result) {
  if (scanned || !result?.data) return;

  setScanned(true);
  setScanError("");

  try {
    const response = await verifyScannedQR(result.data);

    if (typeof onQRScanned === "function") {
      onQRScanned({
        success: true,
        action: response.action,
        message: response.message,
        data: response.data,
      });
    }
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "QR verification failed. Please try again.";

    setScanError(message);

    if (typeof onQRScanned === "function") {
      onQRScanned({
        success: false,
        message,
      });
    }
  }
}


  function retryScan() {
    setScanned(false);
    setScanError("");
  }

  // Permission is still being checked.
  if (!permission) {
    return (
      <View style={styles.permissionScreen}>
        <ActivityIndicator size="large" color="#20D9A0" />
        <Text style={styles.permissionText}>
          Checking camera permission...
        </Text>
      </View>
    );
  }

  // Camera permission was denied.
  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>
          Camera Permission Required
        </Text>

        <Text style={styles.permissionText}>
          Allow camera access to scan the attendance QR code.
        </Text>

        {permission.canAskAgain ? (
          <Pressable
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.primaryButtonText}>
              Allow Camera
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.permissionText}>
            Enable camera access for Expo Go in your phone settings.
          </Text>
        )}

        <Pressable
          style={styles.cancelButton}
          onPress={onClose}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen camera preview */}
  <CameraView
  style={styles.camera}
  facing="back"
  active={true}
  barcodeScannerSettings={{
    barcodeTypes: ["qr"],
  }}
  onBarcodeScanned={scanned ? undefined : handleScan}
/>

      {/* Controls are layered above the camera */}
      <View
        style={styles.overlay}
        pointerEvents="box-none"
      >
        {/* Top header */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
          >
            <Text style={styles.closeIcon}>×</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Scan Attendance QR
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Flexible middle area keeps frame between controls */}
        <View style={styles.middleArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.instruction}>
            QR code ko frame ke andar rakho
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomPanel}>
          <Text style={styles.statusText}>
            {scanned
  ? scanError
    ? scanError
    : "QR scanned. Verifying attendance..."
  : "Point camera toward the QR code."}
          </Text>

          {scanned && (
            <Pressable
              style={styles.primaryButton}
              onPress={retryScan}
            >
              <Text style={styles.primaryButtonText}>
                Scan Again
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
 container: {
  flex: 1,
  width: "100%",
  position: "relative",
  overflow: "hidden",
},

camera: {
  flex: 1,
  width: "100%",
  height: "100%",
},


overlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  flexDirection: "column",
  justifyContent: "flex-start",
},


  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.50)",
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.20)",
  },

  closeIcon: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "400",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  headerSpacer: {
    width: 42,
  },

 
middleArea: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 20,
},


  scanFrame: {
    width: 250,
    height: 250,
    maxWidth: "100%",
    position: "relative",
  },

  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: "#20D9A0",
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 12,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 12,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 12,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 12,
  },

  instruction: {
    marginTop: 20,
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 12,
  },

  bottomPanel: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },

  primaryButton: {
    minHeight: 44,
    backgroundColor: "#079B70",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  cancelText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  permissionScreen: {
    flex: 1,
    backgroundColor: "#202124",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },

  permissionText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 16,
  },
});
