

| Layer | AI / ML Feature | Purpose | Notes / Implementation  |
| ----- | ----- | ----- | ----- |
| **1\. Image Verification (Computer Vision)** | CNN-based Packaging / Logo Recognition | Detect counterfeit products by analyzing logos, packaging patterns, and holograms | TensorFlow Lite or PyTorch Mobile for on-device inference; retrain with new local product images |
|  | Defect / Tamper Detection | Identify scratches, anomalies, misprints, hologram forgery | Augmentation with synthetic and real datasets; threshold-based confidence scoring |
|  | OCR for Labels / Serial Numbers | Verify printed codes and serial numbers against blockchain registry | OpenCV \+ Tesseract; preprocess for lighting, blur, and font variations |
| **2\. Dynamic QR / NFC Authentication** | ML-based QR/NFC Anomaly Detection | Detect cloned QR codes by evaluating scan patterns, usage history, and cryptographic inconsistencies | On-device or backend validation; pattern recognition agent flags suspicious activity |
| **3\. Predictive Analytics** | Fraud Risk Scoring | Assign risk scores to products, suppliers, or batches | Feature set: manufacturer history, geolocation, prior counterfeit incidents; ML model predicts likelihood of fraud |
|  | Trend Detection / Hotspot Prediction | Identify regions or suppliers with repeated counterfeit activity | Time series or spatial ML; output visualizations for regulators & manufacturers |
| **4\. User Behavior Analysis** | SME / Consumer Scanning Behavior Model | Detect abnormal scanning behavior (possible system abuse or insider fraud) | Reinforcement learning or anomaly detection on usage logs |
| **5\. Automated Agents** | Supply Chain Monitoring Agent | Continuously monitors registered suppliers, flags anomalies in product flow | Agents use blockchain \+ ML alerts to report suspicious entries; autonomous reporting to admin dashboard |
|  | Smart Contract Enforcement Agent | Automates blocking of counterfeit product entries or revoking registrations | Connects with blockchain ledger; ML agent decides action based on fraud scoring |
|  | Customer Support Chatbot | Handles SME queries, guides verification steps, flags incidents | LLM-based conversational agent (e.g., GPT-style fine-tuned for local SME queries) |
| **6\. Data Quality / Model Feedback** | Human-in-the-loop Verification Agent | Aggregates SME reports of false positives, retrains CV models automatically | Active learning pipeline; reduces false positives over time |
|  | Model Drift Detection | Monitors AI performance and triggers retraining when accuracy drops | Continuous evaluation on new product scans; alerts devops team |
| **7\. Recommendation / Advisory** | Supplier Recommendation Engine | Suggest verified suppliers to SMEs based on fraud risk scores and past product quality | Collaborative filtering or supervised ML models; integrated into SME portal |
|  | Compliance Advisory Agent | Advises SMEs on legal or certification risks based on BSTI / import regulations | Rule-based \+ ML agent combining historical data and regulatory updates |

