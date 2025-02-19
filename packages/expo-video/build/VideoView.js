import { PureComponent, createRef, useRef, useMemo, useEffect, } from 'react';
import NativeVideoModule from './NativeVideoModule';
import NativeVideoView from './NativeVideoView';
/**
 * Creates a `VideoPlayer`, which will be automatically cleaned up when the component is unmounted.
 * @param source - A video source that is used to initialize the player.
 * @param setup - A function that allows setting up the player. It will run after the player is created.
 */
export function useVideoPlayer(source, setup) {
    const parsedSource = typeof source === 'string' ? { uri: source } : source;
    return useReleasingSharedObject(() => {
        const player = new NativeVideoModule.VideoPlayer(parsedSource);
        setup?.(player);
        return player;
    }, [JSON.stringify(parsedSource)]);
}
/**
 * Returns whether the current device supports Picture in Picture (PiP) mode.
 * @returns A `boolean` which is `true` if the device supports PiP mode, and `false` otherwise.
 * @platform android
 * @platform ios
 */
export function isPictureInPictureSupported() {
    return NativeVideoModule.isPictureInPictureSupported();
}
export class VideoView extends PureComponent {
    nativeRef = createRef();
    /**
     * Enters fullscreen mode.
     */
    enterFullscreen() {
        this.nativeRef.current?.enterFullscreen();
    }
    /**
     * Exits fullscreen mode.
     */
    exitFullscreen() {
        this.nativeRef.current?.exitFullscreen();
    }
    /**
     * Enters Picture in Picture (PiP) mode. Throws an exception if the device does not support PiP.
     * > **Note:** Only one player can be in Picture in Picture (PiP) mode at a time.
     * @platform android
     * @platform ios 14+
     */
    startPictureInPicture() {
        return this.nativeRef.current?.startPictureInPicture();
    }
    /**
     * Exits Picture in Picture (PiP) mode.
     * @platform android
     * @platform ios 14+
     */
    stopPictureInPicture() {
        return this.nativeRef.current?.stopPictureInPicture();
    }
    render() {
        const { player, ...props } = this.props;
        const playerId = getPlayerId(player);
        return <NativeVideoView {...props} player={playerId} ref={this.nativeRef}/>;
    }
}
// Temporary solution to pass the shared object ID instead of the player object.
// We can't really pass it as an object in the old architecture.
// Technically we can in the new architecture, but it's not possible yet.
function getPlayerId(player) {
    if (player instanceof NativeVideoModule.VideoPlayer) {
        // @ts-expect-error
        return player.__expo_shared_object_id__;
    }
    if (typeof player === 'number') {
        return player;
    }
    return null;
}
/**
 * Returns a shared object, which is automatically cleaned up when the component is unmounted.
 */
function useReleasingSharedObject(factory, dependencies) {
    const objectRef = useRef(null);
    const isFastRefresh = useRef(false);
    const previousDependencies = useRef(dependencies);
    if (objectRef.current == null) {
        objectRef.current = factory();
    }
    const object = useMemo(() => {
        let newObject = objectRef.current;
        const dependenciesAreEqual = previousDependencies.current?.length === dependencies.length &&
            dependencies.every((value, index) => value === previousDependencies.current[index]);
        // If the dependencies have changed, release the previous object and create a new one, otherwise this has been called
        // because of a fast refresh, and we don't want to release the object.
        if (!newObject || !dependenciesAreEqual) {
            objectRef.current?.release();
            newObject = factory();
            objectRef.current = newObject;
            previousDependencies.current = dependencies;
        }
        else {
            isFastRefresh.current = true;
        }
        return newObject;
    }, dependencies);
    useEffect(() => {
        isFastRefresh.current = false;
        return () => {
            // This will be called on every fast refresh and on unmount, but we only want to release the object on unmount.
            if (!isFastRefresh.current && objectRef.current) {
                objectRef.current.release();
            }
        };
    }, []);
    return object;
}
//# sourceMappingURL=VideoView.js.map