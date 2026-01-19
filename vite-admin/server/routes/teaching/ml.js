// server/routes/teaching/ml.js
import express from 'express';
import mlService from '../../services/mlService.js';

const router = express.Router();

// Predict application success
router.post('/predict/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const prediction = await mlService.predictApplicationSuccess(parseInt(applicationId));
    
    res.json({
      success: true,
      message: 'ML prediction completed successfully',
      prediction: {
        applicationId: parseInt(applicationId),
        score: prediction.score,
        confidence: prediction.confidence,
        category: prediction.category,
        featuresUsed: prediction.features_used,
        modelMetadata: prediction.model_metadata
      }
    });

  } catch (error) {
    console.error('Error running ML prediction:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to run ML prediction' 
    });
  }
});

// Get ML predictions for an application
router.get('/predictions/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const predictions = await mlService.getMLPredictions(parseInt(applicationId));
    
    res.json({
      success: true,
      predictions: predictions.map(pred => ({
        id: pred.id,
        modelName: pred.model_name,
        modelVersion: pred.model_version,
        predictionScore: pred.prediction_score,
        confidenceLevel: pred.confidence_level,
        featuresUsed: pred.features_used,
        modelMetadata: pred.model_metadata,
        createdAt: pred.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching ML predictions:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch ML predictions' 
    });
  }
});

// Get model performance metrics
router.get('/performance', async (req, res) => {
  try {
    const performance = await mlService.getModelPerformance();
    
    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Error fetching model performance:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch model performance' 
    });
  }
});

// Batch prediction for multiple applications
router.post('/batch-predict', async (req, res) => {
  try {
    const { applicationIds } = req.body;
    
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ 
        error: 'applicationIds must be a non-empty array' 
      });
    }

    if (applicationIds.length > 50) {
      return res.status(400).json({ 
        error: 'Maximum 50 applications can be processed in batch' 
      });
    }

    const predictions = await mlService.batchPredict(applicationIds);
    
    res.json({
      success: true,
      message: `Batch prediction completed for ${applicationIds.length} applications`,
      predictions: predictions.map((pred, index) => ({
        applicationId: applicationIds[index],
        score: pred.score,
        confidence: pred.confidence,
        category: pred.category,
        featuresUsed: pred.features_used
      }))
    });

  } catch (error) {
    console.error('Error running batch prediction:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to run batch prediction' 
    });
  }
});

// Get ML model information
router.get('/model-info', async (req, res) => {
  try {
    res.json({
      success: true,
      modelInfo: {
        name: mlService.modelName,
        version: mlService.modelVersion,
        description: 'Faculty Recruitment Success Prediction Model',
        features: [
          'Education Level & University Tier',
          'Years of Experience',
          'Teaching & Research Experience',
          'Publications & Research Output',
          'Application Quality & Completeness',
          'Career Progression Indicators'
        ],
        outputCategories: [
          'excellent (85-100)',
          'good (70-84)',
          'average (55-69)',
          'below_average (40-54)',
          'poor (0-39)'
        ],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching model info:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch model info' 
    });
  }
});

export default router;
