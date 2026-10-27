import { LanguageCode } from './types';

export interface TranslationStrings {
  appName: string;
  plantSubtitle: string;
  nav: {
    dashboard: string;
    branches: string;
    alerts: string;
    components: string;
    reports: string;
    settings: string;
  };
  kpi: {
    totalBranches: string;
    trackedComponents: string;
    healthyStock: string;
    lowWarning: string;
    criticalStockout: string;
    activeAlerts: string;
  };
  status: {
    healthy: string;
    warning: string;
    critical: string;
    stockout: string;
  };
  actions: {
    simulateConsumption: string;
    refillLowStock: string;
    addComponent: string;
    pauseFeed: string;
    resumeFeed: string;
    exportCsv: string;
    acknowledge: string;
    resolveRefill: string;
    refillUnit: string;
  };
  sections: {
    heatmapTitle: string;
    predictionTitle: string;
    autoPoTitle: string;
    liveFeedRunning: string;
    liveFeedPaused: string;
  };
  roles: {
    operator: string;
    supervisor: string;
    admin: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationStrings> = {
  en: {
    appName: 'StockSentinel',
    plantSubtitle: 'Production Line Early Warning',
    nav: {
      dashboard: 'Dashboard',
      branches: 'Branches',
      alerts: 'Alerts',
      components: 'Components',
      reports: 'Reports',
      settings: 'Settings',
    },
    kpi: {
      totalBranches: 'Active Branches',
      trackedComponents: 'Tracked Components',
      healthyStock: 'Healthy State',
      lowWarning: 'Low Warning (<4h)',
      criticalStockout: 'Critical (<1h)',
      activeAlerts: 'Open Alerts',
    },
    status: {
      healthy: 'Healthy',
      warning: 'Warning',
      critical: 'Critical',
      stockout: 'Stock-out',
    },
    actions: {
      simulateConsumption: 'Simulate 30m Run',
      refillLowStock: 'Refill At-Risk Bins',
      addComponent: 'Add Component',
      pauseFeed: 'Pause Sensor Feed',
      resumeFeed: 'Resume Sensor Feed',
      exportCsv: 'Download CSV',
      acknowledge: 'Acknowledge',
      resolveRefill: 'Resolve & Refill',
      refillUnit: 'Refill Bin',
    },
    sections: {
      heatmapTitle: 'Branch & Workstation Floor Matrix',
      predictionTitle: 'Time-to-Stockout Prediction & Depletion Curve',
      autoPoTitle: 'Auto-Generated Purchase Requests',
      liveFeedRunning: 'Live sensor simulation active (3s cycle)',
      liveFeedPaused: 'Sensor simulation paused',
    },
    roles: {
      operator: 'Operator',
      supervisor: 'Supervisor',
      admin: 'Admin',
    },
  },
  ta: {
    appName: 'StockSentinel',
    plantSubtitle: 'உற்பத்தி வரிசை முன்கூட்டிய எச்சரிக்கை',
    nav: {
      dashboard: 'முகப்புப் பலகை',
      branches: 'கிளைகள்',
      alerts: 'எச்சரிக்கைகள்',
      components: 'பாகங்கள்',
      reports: 'அறிக்கைகள்',
      settings: 'அமைப்புகள்',
    },
    kpi: {
      totalBranches: 'செயலில் உள்ள கிளைகள்',
      trackedComponents: 'கண்காணிப்பு பாகங்கள்',
      healthyStock: 'போதுமான இருப்பு',
      lowWarning: 'குறைந்த இருப்பு (<4ம)',
      criticalStockout: 'அவசர நிலை (<1ம)',
      activeAlerts: 'திறந்த எச்சரிக்கைகள்',
    },
    status: {
      healthy: 'போதுமானது',
      warning: 'எச்சரிக்கை',
      critical: 'அவசரம்',
      stockout: 'இருப்பு காலி',
    },
    actions: {
      simulateConsumption: '30நி நுகர்வு இயக்கு',
      refillLowStock: 'குறைந்த பெட்டிகளை நிரப்பு',
      addComponent: 'புதிய பாகம் சேர்',
      pauseFeed: 'சென்சார் நிறுத்து',
      resumeFeed: 'சென்சார் தொடங்கு',
      exportCsv: 'CSV பதிவிறக்கு',
      acknowledge: 'ஏற்றுக்கொள்',
      resolveRefill: 'நிரப்பித் தீர்வு செய்',
      refillUnit: 'நிரப்பு',
    },
    sections: {
      heatmapTitle: 'கிளை மற்றும் பணிநிலைய நிலை கட்டம்',
      predictionTitle: 'இருப்பு முடிவு நேரக் கணிப்பு & வரைபடம்',
      autoPoTitle: 'தானியங்கி கொள்முதல் கோரிக்கைகள்',
      liveFeedRunning: 'நேரடி சென்சார் இயங்குகிறது (3வி சுழற்சி)',
      liveFeedPaused: 'சென்சார் இடைநிறுத்தப்பட்டது',
    },
    roles: {
      operator: 'இயக்குபவர்',
      supervisor: 'மேற்பார்வையாளர்',
      admin: 'நிர்வாகி',
    },
  },
  hi: {
    appName: 'StockSentinel',
    plantSubtitle: 'उत्पादन लाइन पूर्व चेतावनी प्रणाली',
    nav: {
      dashboard: 'डैशबोर्ड',
      branches: 'शाखाएं',
      alerts: 'चेतावनियां',
      components: 'पुर्जे प्रबंधन',
      reports: 'रिपोर्ट्स',
      settings: 'सेटिंग्स',
    },
    kpi: {
      totalBranches: 'सक्रिय शाखाएं',
      trackedComponents: 'ट्रैक किए गए पुर्जे',
      healthyStock: 'सुरक्षित स्टॉक',
      lowWarning: 'कम स्टॉक (<4घं)',
      criticalStockout: 'गंभीर स्थिति (<1घं)',
      activeAlerts: 'सक्रिय अलर्ट',
    },
    status: {
      healthy: 'सुरक्षित',
      warning: 'चेतावनी',
      critical: 'गंभीर',
      stockout: 'स्टॉक समाप्त',
    },
    actions: {
      simulateConsumption: '30मि खपत चलाएं',
      refillLowStock: 'कम स्टॉक रीफिल करें',
      addComponent: 'नया पुर्जा जोड़ें',
      pauseFeed: 'सेंसर रोकें',
      resumeFeed: 'सेंसर चालू करें',
      exportCsv: 'CSV डाउनलोड करें',
      acknowledge: 'स्वीकार करें',
      resolveRefill: 'रीफिल व समाधान',
      refillUnit: 'रीफिल करें',
    },
    sections: {
      heatmapTitle: 'शाखा और वर्कस्टेशन स्थिति मैट्रिक्स',
      predictionTitle: 'स्टॉक समाप्ति पूर्वानुमान और रुझान चार्ट',
      autoPoTitle: 'स्वचालित खरीद अनुरोध (PO)',
      liveFeedRunning: 'लाइव सेंसर सिमुलेशन सक्रिय (3से चक्र)',
      liveFeedPaused: 'सेंसर सिमुलेशन रुका हुआ है',
    },
    roles: {
      operator: 'ऑपरेटर',
      supervisor: 'सुपरवाइजर',
      admin: 'एडमिन',
    },
  },
};
