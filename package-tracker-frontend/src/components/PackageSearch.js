import React, { useState } from 'react';
import './PackageSearch.css';
import apiService, { formatApiError } from '../services/apiService';

const PackageSearch = ({ packages, onPackageSelect, onPathCalculate }) => {
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      alert("Veuillez saisir l'ID du colis");
      return;
    }

    setLoading(true);
    
    try {
      // 使用API搜索包裹
      const searchResults = await apiService.searchPackages(searchId);
      
      if (searchResults && searchResults.length > 0) {
        const foundPackage = searchResults[0]; // 取第一个结果
        setSearchResult(foundPackage);
        onPackageSelect(foundPackage);
        
        // 计算路径
        if (onPathCalculate) {
          await onPathCalculate(foundPackage);
        }
      } else {
        setSearchResult(null);
        alert('Aucun colis correspondant trouvé');
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorInfo = formatApiError(error);
      alert(`Échec de la recherche : ${errorInfo.message}`);
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'created': 'Créé',
      'in_transit': 'En transit',
      'processing': 'En cours',
      'delivered': 'Livré',
      'delayed': 'Retardé'
    };
    return statusMap[status] || status;
  };

  const getCategoryText = (category) => {
    return category === 1 ? 'Express' : 'Standard';
  };

  const formatTime = (time) => {
    return `${time.toFixed(2)} heures`;
  };

  return (
    <div className="package-search">
      <div className="search-container">
  <h2>Recherche de colis</h2>
        <div className="search-input-group">
            <input
            type="text"
            className="search-input"
            placeholder="Entrez l'ID du colis ou un mot-clé..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {searchResult && (
        <div className="search-result">
          <h3>Informations sur le colis</h3>
          <div className="package-details">
            <div className="detail-row">
              <span className="label">ID du colis:</span>
              <span className="value">{searchResult.id}</span>
            </div>
            <div className="detail-row">
              <span className="label">Type:</span>
              <span className={`value category-${searchResult.category}`}>
                {getCategoryText(searchResult.category)}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Statut:</span>
              <span className={`value status-${searchResult.status}`}>
                {getStatusText(searchResult.status)}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Expéditeur:</span>
              <span className="value">{searchResult.src}</span>
            </div>
            <div className="detail-row">
              <span className="label">Destinataire:</span>
              <span className="value">{searchResult.dst}</span>
            </div>
            <div className="detail-row">
              <span className="label">Position actuelle:</span>
              <span className="value">{searchResult.currentLocation}</span>
            </div>
            <div className="detail-row">
              <span className="label">Date de création:</span>
              <span className="value">{formatTime(searchResult.createTime)}</span>
            </div>
          </div>

          {searchResult.history && searchResult.history.length > 0 && (
            <div className="package-history">
              <h4>Historique de transport</h4>
              <div className="history-list">
                {searchResult.history.map((event, index) => (
                  <div key={index} className="history-item">
                    <div className="history-time">
                      {formatTime(event.timestamp)}
                    </div>
                    <div className="history-location">
                      {event.location}
                    </div>
                    <div className="history-action">
                      {event.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="package-list">
  <h3>Liste de tous les colis</h3>
        <div className="packages-grid">
          {packages.slice(0, 10).map((pkg) => (
            <div 
              key={pkg.id} 
              className="package-item"
              onClick={() => {
                setSearchResult(pkg);
                onPackageSelect(pkg);
                if (onPathCalculate) {
                  onPathCalculate(pkg);
                }
              }}
            >
              <div className="package-id">{pkg.id.substring(0, 8)}...</div>
              <div className={`package-category category-${pkg.category}`}>
                {getCategoryText(pkg.category)}
              </div>
              <div className="package-route">
                {pkg.src} → {pkg.dst}
              </div>
              <div className={`package-status status-${pkg.status}`}>
                {getStatusText(pkg.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PackageSearch;