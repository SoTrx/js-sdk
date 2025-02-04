/*
Copyright 2022 The Dapr Authors
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import GRPCClient from "./GRPCClient";
import { LockResponse as LockResponseResult } from "../../../types/lock/LockResponse";
import { UnlockResponse as UnLockResponseResult, LockStatus } from "../../../types/lock/UnlockResponse";
import {
  TryLockRequest,
  TryLockResponse,
  UnlockRequest,
  UnlockResponse,
} from "../../../proto/dapr/proto/runtime/v1/dapr_pb";
import IClientLock from "../../../interfaces/Client/IClientLock";
import { promisify } from "util";

export default class GRPCClientLock implements IClientLock {
  client: GRPCClient;

  constructor(client: GRPCClient) {
    this.client = client;
  }

  async lock(
    storeName: string,
    resourceId: string,
    lockOwner: string,
    expiryInSeconds: number,
  ): Promise<LockResponseResult> {
    const request = new TryLockRequest()
      .setStoreName(storeName)
      .setResourceId(resourceId)
      .setLockOwner(lockOwner)
      .setExpiryInSeconds(expiryInSeconds);

    const client = await this.client.getClient();
    const tryLock = promisify<TryLockRequest, TryLockResponse>(client.tryLockAlpha1).bind(client);
    const res = await tryLock(request);

    return {
      success: res.getSuccess(),
    };
  }

  async unlock(storeName: string, resourceId: string, lockOwner: string): Promise<UnLockResponseResult> {
    const request = new UnlockRequest().setStoreName(storeName).setResourceId(resourceId).setLockOwner(lockOwner);

    const client = await this.client.getClient();

    const unlock = promisify<UnlockRequest, UnlockResponse>(client.unlockAlpha1).bind(client);
    const res = await unlock(request);

    return {
      status: this.getUnlockResponse(res),
    };
  }

  getUnlockResponse(res: UnlockResponse) {
    switch (res.getStatus()) {
      case UnlockResponse.Status.SUCCESS:
        return LockStatus.Success;
      case UnlockResponse.Status.LOCK_DOES_NOT_EXIST:
        return LockStatus.LockDoesNotExist;
      case UnlockResponse.Status.LOCK_BELONGS_TO_OTHERS:
        return LockStatus.LockBelongsToOthers;
      default:
        return LockStatus.InternalError;
    }
  }
}
