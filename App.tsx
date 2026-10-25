import React, { useState, useEffect } from 'react';
import { DeviceFrame } from './components/DeviceFrame';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AggressiveModeView } from './components/AggressiveModeView';
import { AddProductModal } from './components/AddProductModal';
import { SettingsModal } from './components/SettingsModal';
import { ReflexTrainerModal } from './components/ReflexTrainerModal';
import { KotlinExportModal } from './components/KotlinExportModal';
import { FlashSaleProduct, AppSettings } from './types/product';
import { ProductStorageService } from './utils/storage';
import { audioNotifier } from './utils/audioNotification';

export default function App() {
  const [products, setProducts] = useState<FlashSaleProduct[]>(() =>
    ProductStorageService.getProducts()
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    ProductStorageService.getSettings()
  );
  const [activeTab, setActiveTab] = useState<'dashboard' | 'aggressive'>('dashboard');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FlashSaleProduct | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReflexTrainerOpen, setIsReflexTrainerOpen] = useState(false);
  const [isKotlinExportOpen, setIsKotlinExportOpen] = useState(false);

  // Precision Real-time clock ticker
  useEffect(() => {
    // 100ms interval provides smooth millisecond / decisecond rendering for aggressive mode
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Background reminder checker for products approaching flash sale
  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    products.forEach((product) => {
      const diffMs = product.promoTime - currentTime;
      const diffMinutes = Math.floor(diffMs / 60000);

      // Trigger if matches reminderMinutes window (e.g. within 30 seconds of target window)
      if (
        product.reminderMinutes > 0 &&
        diffMinutes === product.reminderMinutes &&
        !product.reminderTriggered
      ) {
        audioNotifier.sendNotification(`⚡ PENGINGAT RADAR: ${product.name}`, {
          body: `Flash Sale Shopee dimulai dalam ${product.reminderMinutes} menit lagi! Siapkan aplikasi Shopee Anda.`,
        });
        if (settings.soundEnabled) {
          audioNotifier.playSound('warning', settings.soundVolume);
        }
        if (settings.vibrationEnabled) {
          audioNotifier.vibrate([100, 50, 100]);
        }

        // Mark triggered
        const updated = products.map((p) =>
          p.id === product.id ? { ...p, reminderTriggered: true } : p
        );
        setProducts(updated);
        ProductStorageService.saveProducts(updated);
      }
    });
  }, [currentTime, products, settings]);

  // Product CRUD actions
  const handleSaveProduct = (product: FlashSaleProduct) => {
    let updated: FlashSaleProduct[];
    const exists = products.some((p) => p.id === product.id);
    if (exists) {
      updated = ProductStorageService.updateProduct(product);
    } else {
      updated = ProductStorageService.insertProduct(product);
    }
    setProducts(updated);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = ProductStorageService.deleteProduct(id);
    setProducts(updated);
  };

  const handleTogglePriority = (id: string) => {
    const updated = ProductStorageService.togglePriority(id);
    setProducts(updated);
    if (settings.vibrationEnabled) {
      audioNotifier.vibrate(40);
    }
  };

  const handleResetSamples = () => {
    const reset = ProductStorageService.resetToSamples();
    setProducts(reset);
  };

  const handleClearAll = () => {
    const cleared = ProductStorageService.clearAll();
    setProducts(cleared);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    ProductStorageService.saveSettings(newSettings);
  };

  const handleImportProducts = (imported: FlashSaleProduct[]) => {
    setProducts(imported);
    ProductStorageService.saveProducts(imported);
  };

  return (
    <DeviceFrame
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
    >
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenKotlinExport={() => setIsKotlinExportOpen(true)}
        onOpenReflexTrainer={() => setIsReflexTrainerOpen(true)}
        totalProducts={products.length}
      />

      {activeTab === 'dashboard' ? (
        <DashboardView
          products={products}
          currentTime={currentTime}
          onOpenAddModal={() => {
            setEditingProduct(null);
            setIsAddModalOpen(true);
          }}
          onTogglePriority={handleTogglePriority}
          onDeleteProduct={handleDeleteProduct}
          onEditProduct={(prod) => {
            setEditingProduct(prod);
            setIsAddModalOpen(true);
          }}
          preferAppIntent={settings.preferAppIntent}
        />
      ) : (
        <AggressiveModeView
          products={products}
          currentTime={currentTime}
          settings={settings}
          onTogglePriority={handleTogglePriority}
          onOpenAddModal={() => {
            setEditingProduct(null);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* Add / Edit Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetSamples={handleResetSamples}
        onClearAll={handleClearAll}
        products={products}
        onImportProducts={handleImportProducts}
      />

      {/* Reflex Trainer Modal */}
      <ReflexTrainerModal
        isOpen={isReflexTrainerOpen}
        onClose={() => setIsReflexTrainerOpen(false)}
      />

      {/* Kotlin Jetpack Compose Code Export Modal */}
      <KotlinExportModal
        isOpen={isKotlinExportOpen}
        onClose={() => setIsKotlinExportOpen(false)}
      />
    </DeviceFrame>
  );
}
