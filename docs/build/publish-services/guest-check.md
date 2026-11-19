# Guest check (client API, new guest) — 2026-11-19T10:48:52Z

Script: POST /v1/auth/init (new guest, restoredBy=new_guest) → POST /v1/progress/me/init → POST /v1/iap/init → POST /v1/iap/store/products (empty body). Tokens redacted.

```
AUTH 200 null {"uid":31225,"gid":31242,"jwt":"<redacted>","at":1795085332,"expiresAt":"2026-12-19T10:48:52.000Z","an":true,"geo":"","geoReg":"","reg":"2026-11-19T10:48:52.287Z","account":{"registeredAt":1795085332,"lastLoginAt":1795085332},"ms":null,"mc":null,"restoredBy":"new_guest","deviceKey":"<redacted>"}

/v1/progress/me/init 200 rid=null 
{
 "states": [
  {
   "key": "progress_main",
   "status": "active",
   "periodKey": "progress_main:permanent",
   "attemptId": "4802f2e651a774f62fffe32a",
   "endsAt": null,
   "selectedStepKeys": [],
   "steps": {
    "level_1": {
     "status": "available",
     "availableAt": null,
     "conditions": {
      "win": {
       "value": 0,
       "completed": false
      }
     }
    },
    "level_2": {
     "status": "locked",
     "availableAt": null,
     "conditions": {
      "win": {
       "value": 0,
       "completed": false
      }
     }
    },
    "level_3": {
     "status": "locked",
     "availableAt": null,
     "conditions": {
      "win": {
       "value": 0,
       "completed": false
      }
     }
    },
    "level_4": {
     "status": "locked",
     "availableAt": null,
     "conditions": {
      "win": {
       "value": 0,
       "completed": false
      }
     }
    },
    "level_5": {
     "status": "locked",
     "availableAt": null,
     "conditions": {
      "win": {
       "value": 0,
       "completed": false
      }
     }
    }
   },
   "groups": {},
   "rewards": []
  }
 ]
}

/v1/iap/init 200 rid=null 
{
 "filterContext": {
  "custom": {
   "iap": {
    "noads": false
   }
  }
 },
 "pendingOrders": [],
 "entitlements": [],
 "offerState": {},
 "ads": {
  "advanceOutstanding": 0,
  "advanceMax": 0
 }
}

/v1/iap/store/products 400 rid=null 
{
 "code": "VALIDATION_FAILED",
 "msg": "Validation failed",
 "rid": "3620511c-56b1-4aed-9aa4-39b9e5bdbd3c",
 "details": null
}
```
